import psycopg2  # type: ignore
from psycopg2 import extras, pool  # type: ignore
import os
import json
import time
from datetime import datetime
from typing import Optional

DATABASE_URL = os.getenv("DATABASE_URL")

# ── Product cache ─────────────────────────────────────────
_products_cache = None
_products_cache_time = 0

def _invalidate_products_cache():
    global _products_cache
    _products_cache = None

_db_pool = None

def init_pool():
    global _db_pool
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL environment variable is not set")
    if _db_pool is None:
        print("🔧 Initializing Postgres Connection Pool...")
        _db_pool = pool.ThreadedConnectionPool(1, 40, DATABASE_URL, cursor_factory=extras.RealDictCursor)

def get_connection():
    """Get a PostgreSQL connection from the ThreadedConnectionPool."""
    if _db_pool is None:
        init_pool()
    assert _db_pool is not None
    return _db_pool.getconn()

def release_connection(conn):
    if _db_pool is not None and conn is not None:
        try:
            _db_pool.putconn(conn)
        except Exception as e:
            print(f"Error releasing connection: {e}")

def init_db():
    """Create tables, run migrations, and reseed products."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Products table ────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            category TEXT NOT NULL,
            base_name TEXT NOT NULL DEFAULT '',
            unit TEXT NOT NULL DEFAULT 'kg'
        )
    """)

    # ── Orders table ──────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id SERIAL PRIMARY KEY,
            token TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            items_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Processing',
            total REAL NOT NULL,
            timestamp TEXT NOT NULL,
            address TEXT,
            delivery_type TEXT NOT NULL DEFAULT 'pickup',
            delivery_time TEXT NOT NULL DEFAULT 'same_day',
            delivered_at TEXT,
            delivery_otp TEXT
        )
    """)

    # ── Customers table ───────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customers (
            phone TEXT PRIMARY KEY,
            name TEXT,
            email TEXT,
            address TEXT,
            pin_hash TEXT,
            cancel_timestamps TEXT DEFAULT '[]',
            created_at TEXT NOT NULL
        )
    """)

    # ── Token counter table ───────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS counters (
            name TEXT PRIMARY KEY,
            value INTEGER NOT NULL DEFAULT 100
        )
    """)

    # ── Initialize counter ────────────────────────────────
    cursor.execute(
        "INSERT INTO counters (name, value) VALUES ('order_token', 100) ON CONFLICT DO NOTHING"
    )

    # ── Conditional reseed products ───────────────────────
    cursor.execute("SELECT COUNT(*) as count FROM products")
    row = cursor.fetchone()
    count = row['count'] if row else 0
    
    force_reseed = os.getenv("RESEED_DB", "false").lower() == "true"
    
    if count == 0 or force_reseed:
        if force_reseed:
            print("🔄 RESEED_DB=true detected. Forcing reseed...")
        else:
            print("🌱 Database empty. Initializing products...")
            
        cursor.execute("TRUNCATE TABLE products RESTART IDENTITY")
        _seed_products(cursor)
    else:
        print(f"✅ Products already exist ({count} items). Skipping seeding to save time.")

    conn.commit()
    release_connection(conn)
    _invalidate_products_cache()

def _seed_products(cursor):
    """Seed products from the CSV file."""
    import csv
    import os
    import sqlite3

    # Root directory of the project (one level above 'app' folder)
    csv_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "products_cleaned_v2.csv")
    sqlite_db_path = os.path.join(os.path.dirname(__file__), "store.db")
    
    # Generic images based on category keywords
    category_images = {
        "Rice": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
        "Wheat": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
        "Jowar": "https://images.unsplash.com/photo-1596547609652-9fc5d8d428ce?w=400&h=300&fit=crop",
        "Bajri": "https://images.unsplash.com/photo-1615485925763-86db9d2d22f0?w=400&h=300&fit=crop",
        "Dals": "https://images.unsplash.com/photo-1585996611354-972a9e34c901?w=400&h=300&fit=crop",
        "Pulses": "https://images.unsplash.com/photo-1585996611354-972a9e34c901?w=400&h=300&fit=crop",
        "Sweets": "https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=400&h=300&fit=crop",
        "Bakery": "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
        "Cleaning": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop",
        "Snacks": "https://images.unsplash.com/photo-15994906592a3-e3f9642dd427?w=400&h=300&fit=crop",
        "Misc": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop",
        "Default": "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop"
    }

    final_products = []

    # 1. Load from CSV
    if os.path.exists(csv_file_path):
        try:
            with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    packaging = row.get('packaging', 'standard').strip()
                    base_name = row.get('base_name', '').strip()
                    if packaging.lower() != 'standard' and packaging.lower() != '':
                        name = f"{base_name} {packaging}".strip()
                    else:
                        name = base_name.strip()
                    
                    category = (row.get('ecommerce_category', 'Miscellaneous') or "Miscellaneous").strip()
                    try:
                        price = float(row.get('mrp', 0))
                    except:
                        price = 0.0
                    
                    # Derive unit
                    unit = "kg"
                    lower_name = name.lower()
                    lower_pkg = packaging.lower()
                    
                    if "250g" in lower_name or "250gm" in lower_name or "250g" in lower_pkg:
                        unit = "250g"
                    elif "500g" in lower_name or "500gm" in lower_name or "500g" in lower_pkg:
                        unit = "500g"
                    elif "100g" in lower_name or "100gm" in lower_name or "100g" in lower_pkg:
                        unit = "100g"
                    elif "50g" in lower_name or "50gm" in lower_name:
                        unit = "50g"
                    elif "1kg" in lower_name or "1kg" in lower_pkg:
                        unit = "1kg"
                    elif "ltr" in lower_name or "ltr" in lower_pkg or " l " in f" {lower_pkg} ":
                        unit = "ltr"
                    elif "ml" in lower_name or "ml" in lower_pkg:
                        unit = "ml"

                    # Derive Image URL
                    img_url = category_images["Default"]
                    for key in category_images:
                        if str(key).lower() in category.lower() or str(key).lower() in name.lower():  # type: ignore
                            img_url = category_images.get(key, img_url)  # type: ignore
                            break
                    
                    description = f"₹{int(price)}/{unit} — {packaging}"
                    final_products.append((name, price, description, img_url, category, base_name, unit))
            print(f"📦 Loaded {len(final_products)} products from CSV.")
        except Exception as e:
            print(f"❌ Error during CSV parsing: {e}")
    else:
        print(f"⚠️ CSV file not found at {csv_file_path}.")

    # 2. Load from store.db (SQLite)
    if os.path.exists(sqlite_db_path):
        try:
            sqlite_conn = sqlite3.connect(sqlite_db_path)
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT name, price, description, image_url, category, base_name, unit FROM products")
            sqlite_rows = sqlite_cursor.fetchall()
            initial_count = len(final_products)
            for row in sqlite_rows:
                # Append to the final list
                final_products.append(row)
            sqlite_conn.close()
            print(f"📦 Loaded {len(sqlite_rows)} products from SQLite (store.db).")
        except Exception as e:
            print(f"❌ Error during SQLite parsing: {e}")
    else:
        print(f"⚠️ SQLite database not found at {sqlite_db_path}.")

    # 3. Insert into PostgreSQL
    if final_products:
        try:
            cursor.executemany(
                "INSERT INTO products (name, price, description, image_url, category, base_name, unit) VALUES (%s,%s,%s,%s,%s,%s,%s)",
                final_products,
            )
            print(f"✅ Successfully seeded TOTAL {len(final_products)} products into database.")
        except Exception as e:
            print(f"❌ Error during PostgreSQL insertion: {e}")
    else:
        print("⚠️ No products found to seed.")

def get_all_products():
    """Fetch all products (5-min in-memory cache)."""
    global _products_cache, _products_cache_time
    now = time.time()
    if _products_cache is not None and (now - _products_cache_time) < 300:
        return _products_cache
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM products ORDER BY category, base_name, price")
        rows = cursor.fetchall()
        _products_cache = [dict(row) for row in rows]
        _products_cache_time = now
        return _products_cache
    finally:
        release_connection(conn)

# ── Customer OTP auth ─────────────────────────────────────

def get_customer(phone: str):
    """Fetch customer record by phone."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE phone = %s", (phone,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        release_connection(conn)

def get_customer_by_email(email: str):
    """Fetch customer record by email."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM customers WHERE email = %s", (email,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        release_connection(conn)

def create_or_update_customer(phone: str, name: "Optional[str]" = None, email: "Optional[str]" = None, address: "Optional[str]" = None, pin_hash: "Optional[str]" = None):
    """Insert or update customer details."""
    conn = get_connection()
    existing = get_customer(phone)
    try:
        if existing:
            # Update existing
            if name or email or address or pin_hash:
                query = "UPDATE customers SET "
                params = []
                if name:
                    query += "name = %s, "
                    params.append(name)
                if email:
                    query += "email = %s, "
                    params.append(email)
                if address:
                    query += "address = %s, "
                    params.append(address)
                if pin_hash:
                    query += "pin_hash = %s, "
                    params.append(pin_hash)
                
                query = query.rstrip(', ')
                query += " WHERE phone = %s"
                params.append(phone)
                cursor = conn.cursor()
                cursor.execute(query, tuple(params))
        else:
            # Insert new
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO customers (phone, name, email, address, pin_hash, cancel_timestamps, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                (phone, name, email, address, pin_hash, "[]", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )
        conn.commit()
    finally:
        release_connection(conn)

def update_customer_cancels(phone: str, cancel_timestamps_json: str):
    """Update a customer's cancel timestamps JSON string."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE customers SET cancel_timestamps = %s WHERE phone = %s", (cancel_timestamps_json, phone))
        conn.commit()
    finally:
        release_connection(conn)

def get_all_customers():
    """Fetch all signed-up customers."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT phone, name, address, created_at FROM customers ORDER BY created_at DESC")
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        release_connection(conn)

# ── Orders ────────────────────────────────────────────────

def create_order(phone: str, items: list, total: float, delivery_type: str = "pickup", delivery_time: str = "same_day", address: "Optional[str]" = None) -> str:
    """Create a new order and return the generated token."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Robust increment logic with fallback insertion
        cursor.execute("""
            INSERT INTO counters (name, value) 
            VALUES ('order_token', 101) 
            ON CONFLICT (name) DO UPDATE 
            SET value = counters.value + 1 
            RETURNING value
        """)
        token_num = cursor.fetchone()['value']
        token = str(token_num)

        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        items_json = json.dumps(items)
        
        import random
        delivery_otp = str(random.randint(1000, 9999)) if delivery_type == "delivery" else None

        cursor.execute(
            "INSERT INTO orders (token, phone, items_json, status, total, timestamp, delivery_type, delivery_time, address, delivery_otp) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (token, phone, items_json, "Processing", total, timestamp, delivery_type, delivery_time, address, delivery_otp),
        )

        conn.commit()
        return token
    finally:
        release_connection(conn)
    return ""

def get_all_orders():
    """Fetch all orders (newest first) with customer names."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = '''
            SELECT o.*, c.name as customer_name 
            FROM orders o 
            LEFT JOIN customers c ON o.phone = c.phone 
            ORDER BY o.id DESC
        '''
        cursor.execute(query)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        release_connection(conn)

def get_order_by_token(token: str):
    """Fetch a single order by token with customer name."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = '''
            SELECT o.*, c.name as customer_name 
            FROM orders o 
            LEFT JOIN customers c ON o.phone = c.phone 
            WHERE o.token = %s
        '''
        cursor.execute(query, (token,))
        row = cursor.fetchone()
        return dict(row) if row else None
    finally:
        release_connection(conn)

def get_orders_by_phone(phone: str):
    """Fetch all orders for a customer by phone (newest first)."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT * FROM orders WHERE phone = %s ORDER BY id DESC", (phone,)
        )
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        release_connection(conn)

def update_order_status(token: str, status: str) -> bool:
    """Update order status. Returns True if updated."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE orders SET status = %s WHERE token = %s", (status, token))
        updated = cursor.rowcount > 0
        conn.commit()
        return updated
    finally:
        release_connection(conn)
    return False

def mark_delivered(token: str) -> bool:
    """Mark an order as Delivered with timestamp."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        delivered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.execute(
            "UPDATE orders SET status = 'Delivered', delivered_at = %s WHERE token = %s",
            (delivered_at, token)
        )
        updated = cursor.rowcount > 0
        conn.commit()
        return updated
    finally:
        release_connection(conn)
    return False

# ── Admin Product Management ─────────────────────────────

def add_product(name: str, price: float, description: str, image_url: str, category: str, base_name: str = "", unit: str = "kg") -> Optional[int]:
    """Add a new product to the database."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, price, description, image_url, category, base_name, unit) VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (name, price, description, image_url, category, base_name, unit)
        )
        product_id = cursor.fetchone()['id']
        conn.commit()
        _invalidate_products_cache()
        return product_id
    except Exception as e:
        print(f"Error adding product: {e}")
        return None
    finally:
        release_connection(conn)

def update_product(product_id: int, updates: dict) -> bool:
    """Update an existing product."""
    if not updates:
        return False
    conn = get_connection()
    try:
        cursor = conn.cursor()
        query = "UPDATE products SET "
        params = []
        for key, value in updates.items():
            query += f"{key} = %s, "
            params.append(value)
        query = query.rstrip(', ')
        query += " WHERE id = %s"
        params.append(product_id)
        
        cursor.execute(query, tuple(params))
        updated = cursor.rowcount > 0
        conn.commit()
        _invalidate_products_cache()
    except Exception as e:
        print(f"Error updating product {product_id}: {e}")
        updated = False
    finally:
        release_connection(conn)
    return updated

def delete_product(product_id: int) -> bool:
    """Delete a product by ID."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = %s", (product_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        _invalidate_products_cache()
    except Exception as e:
        print(f"Error deleting product {product_id}: {e}")
        deleted = False
    finally:
        release_connection(conn)
    return deleted
