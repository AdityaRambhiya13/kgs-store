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
            sub_category TEXT NOT NULL DEFAULT '',
            base_name TEXT NOT NULL DEFAULT '',
            unit TEXT NOT NULL DEFAULT 'kg'
        )
    """)

    # ── Migration: Add sub_category if missing ────────────
    cursor.execute("""
        DO $$ BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name='products' AND column_name='sub_category'
            ) THEN
                ALTER TABLE products ADD COLUMN sub_category TEXT NOT NULL DEFAULT '';
            END IF;
        END $$;
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

    # ── Customer Favorites table ──────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_favorites (
            phone TEXT NOT NULL,
            product_id INTEGER NOT NULL,
            added_at TEXT NOT NULL,
            PRIMARY KEY (phone, product_id)
        )
    """)

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
    """Seed products from the ultimate Zepto CSV and store.db SQLite."""
    import csv
    import os
    import sqlite3

    # Root directory of the project (one level above 'app' folder)
    root_dir = os.path.dirname(os.path.dirname(__file__))
    csv_file_path = os.path.join(root_dir, "ULTIMATE_ZEPTO_CATALOG.csv")
    sqlite_db_path = os.path.join(os.path.dirname(__file__), "store.db")

    # Category-based Unsplash image mapping
    CATEGORY_IMAGES = {
        "Atta, Rice & Dal":         "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
        "Masala & Dry Fruits":      "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop",
        "Snacks & Munchies":        "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=400&h=300&fit=crop",
        "Sweet Tooth":              "https://images.unsplash.com/photo-1589119908995-c6837fa14848?w=400&h=300&fit=crop",
        "Cleaning Essentials":      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400&h=300&fit=crop",
        "Instant & Frozen Food":    "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
        "Dairy, Bread & Eggs":      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=300&fit=crop",
        "Personal Care":            "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=300&fit=crop",
        "Cold Drinks & Juices":     "https://images.unsplash.com/photo-1534353473418-4cfa0a62e3d8?w=400&h=300&fit=crop",
        "Pharma & Wellness":        "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&h=300&fit=crop",
        "Tea, Coffee & Health Drinks": "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&h=300&fit=crop",
        "Paan Corner":              "https://images.unsplash.com/photo-1596547609652-9fc5d8d428ce?w=400&h=300&fit=crop",
        "Pantry Staples":           "https://images.unsplash.com/photo-1615485925763-86db9d2d22f0?w=400&h=300&fit=crop",
        "Baby Care":                "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=400&h=300&fit=crop",
        "Home & Lifestyle":         "https://images.unsplash.com/photo-1565183928294-7063f23ce0f8?w=400&h=300&fit=crop",
        "Pooja Needs":              "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=400&h=300&fit=crop",
        "Rice":                     "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
        "Wheat":                    "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop",
        "Jowari":                   "https://images.unsplash.com/photo-1596547609652-9fc5d8d428ce?w=400&h=300&fit=crop",
        "Bajri":                    "https://images.unsplash.com/photo-1615485925763-86db9d2d22f0?w=400&h=300&fit=crop",
        "Default":                  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=="
    }

    def get_image(category):
        return CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["Default"])

    # Blocked categories — exclude irrelevant
    BLOCKED_CATEGORIES = {'Pet Supplies', 'Books & Media', 'Stationery', 'Packaging & Carry Bags'}

    final_products = []  # (name, price, description, image_url, category, sub_category, base_name, unit)

    # 1. Load from ULTIMATE_ZEPTO_CATALOG.csv
    if os.path.exists(csv_file_path):
        try:
            with open(csv_file_path, mode='r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    category = (row.get('Category') or 'Pantry Staples').strip()
                    if category in BLOCKED_CATEGORIES:
                        continue

                    sub_category = (row.get('Sub_Category') or '').strip()
                    name = (row.get('name') or '').strip()
                    standardized = (row.get('Standardized_Name') or name).strip()
                    base_name = standardized if standardized else name
                    size_weight = (row.get('Size_Weight') or '').strip()

                    try:
                        price = float(row.get('mrp') or 0)
                    except (ValueError, TypeError):
                        price = 0.0

                    if price <= 0 or not name:
                        continue

                    # Derive unit from Size_Weight
                    sw_lower = size_weight.lower()
                    if any(x in sw_lower for x in ['kg', 'kgs']):
                        unit = size_weight
                    elif any(x in sw_lower for x in ['500g', '500gm']):
                        unit = '500g'
                    elif any(x in sw_lower for x in ['250g', '250gm']):
                        unit = '250g'
                    elif any(x in sw_lower for x in ['100g', '100gm']):
                        unit = '100g'
                    elif any(x in sw_lower for x in ['50g', '50gm']):
                        unit = '50g'
                    elif 'ltr' in sw_lower or 'litre' in sw_lower:
                        unit = 'ltr'
                    elif 'ml' in sw_lower:
                        unit = 'ml'
                    elif 'pc' in sw_lower or 'pcs' in sw_lower or 'piece' in sw_lower:
                        unit = 'pcs'
                    elif size_weight and size_weight.lower() not in ('nan', ''):
                        unit = size_weight
                    else:
                        unit = 'pcs'

                    description = f"₹{int(price)}/{unit} — {sub_category}" if sub_category else f"₹{int(price)}/{unit}"
                    img_url = get_image(category)

                    final_products.append((name, price, description, img_url, category, sub_category, base_name, unit))

            print(f"📦 Loaded {len(final_products)} products from ULTIMATE_ZEPTO_CATALOG.csv.")
        except Exception as e:
            print(f"❌ Error during CSV parsing: {e}")
    else:
        print(f"⚠️ CSV not found at {csv_file_path}.")

    # 2. Load from store.db (SQLite) — local grains/staples
    if os.path.exists(sqlite_db_path):
        try:
            sqlite_conn = sqlite3.connect(sqlite_db_path)
            sqlite_cursor = sqlite_conn.cursor()
            sqlite_cursor.execute("SELECT name, price, description, image_url, category, base_name FROM products")
            sqlite_rows = sqlite_cursor.fetchall()
            sqlite_conn.close()
            for row in sqlite_rows:
                name, price, description, image_url, category, base_name = row
                # Map old simple categories into the new Zepto style
                mapped_category = "Atta, Rice & Dal"
                sub_category = category  # e.g. "Rice", "Wheat"
                img_url = get_image(category) or image_url
                unit = "kg"
                final_products.append((name, price, description, img_url, mapped_category, sub_category, base_name or name, unit))
            print(f"📦 Loaded {len(sqlite_rows)} products from store.db.")
        except Exception as e:
            print(f"❌ Error during SQLite parsing: {e}")
    else:
        print(f"⚠️ store.db not found at {sqlite_db_path}.")

    # 3. Insert all into PostgreSQL
    if final_products:
        try:
            cursor.executemany(
                "INSERT INTO products (name, price, description, image_url, category, sub_category, base_name, unit) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
                final_products,
            )
            print(f"✅ Successfully seeded {len(final_products)} products into database.")
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

def add_product(name: str, price: float, description: str, image_url: str, category: str, sub_category: str = "", base_name: str = "", unit: str = "kg") -> Optional[int]:
    """Add a new product to the database."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, price, description, image_url, category, sub_category, base_name, unit) VALUES (%s, %s, %s, %s, %s, %s, %s, %s) RETURNING id",
            (name, price, description, image_url, category, sub_category, base_name, unit)
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

# ── Favorites ────────────────────────────────────────────

def get_favorites(phone: str) -> list:
    """Return list of product_ids favorited by the customer."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "SELECT product_id FROM customer_favorites WHERE phone = %s ORDER BY added_at DESC",
            (phone,)
        )
        rows = cursor.fetchall()
        return [row['product_id'] for row in rows]
    finally:
        release_connection(conn)

def add_favorite(phone: str, product_id: int) -> bool:
    """Add a product to favorites. Returns True if newly added, False if already existed."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO customer_favorites (phone, product_id, added_at) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
            (phone, product_id, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        added = cursor.rowcount > 0
        conn.commit()
        return added
    finally:
        release_connection(conn)

def remove_favorite(phone: str, product_id: int) -> bool:
    """Remove a product from favorites. Returns True if removed."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM customer_favorites WHERE phone = %s AND product_id = %s",
            (phone, product_id)
        )
        removed = cursor.rowcount > 0
        conn.commit()
        return removed
    finally:
        release_connection(conn)

def get_category_preferences(phone: str) -> dict:
    """Compute category weights from order history and favorites.
    Returns {category_name: weight} sorted by weight descending.
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        weights = {}

        # Weight from order history (1 pt per item ordered in that category)
        cursor.execute(
            "SELECT items_json FROM orders WHERE phone = %s AND status != 'Cancelled' ORDER BY id DESC LIMIT 20",
            (phone,)
        )
        orders = cursor.fetchall()
        all_products = {p['id']: p for p in get_all_products()}
        for order in orders:
            try:
                items = json.loads(order['items_json'])
                for item in items:
                    pid = item.get('product_id')
                    if pid and pid in all_products:
                        cat = all_products[pid].get('category', '')
                        weights[cat] = weights.get(cat, 0) + item.get('quantity', 1)
            except Exception:
                pass

        # Weight from favorites (2 pts per favorited product — stronger signal)
        favorite_ids = get_favorites(phone)
        for fid in favorite_ids:
            if fid in all_products:
                cat = all_products[fid].get('category', '')
                weights[cat] = weights.get(cat, 0) + 2

        return dict(sorted(weights.items(), key=lambda x: x[1], reverse=True))
    finally:
        release_connection(conn)

def get_trending_products(limit: int = 12) -> list:
    """Return most-ordered products for trending/guest recommendations."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Get top product_ids by order frequency across all orders
        cursor.execute("""
            SELECT items_json FROM orders 
            WHERE status != 'Cancelled' 
            ORDER BY id DESC LIMIT 200
        """)
        rows = cursor.fetchall()
        pid_counts = {}
        for row in rows:
            try:
                items = json.loads(row['items_json'])
                for item in items:
                    pid = item.get('product_id')
                    if pid:
                        pid_counts[pid] = pid_counts.get(pid, 0) + item.get('quantity', 1)
            except Exception:
                pass

        all_products = {p['id']: p for p in get_all_products()}
        # Sort by frequency
        sorted_pids = sorted(pid_counts.keys(), key=lambda x: pid_counts[x], reverse=True)
        result = [all_products[pid] for pid in sorted_pids if pid in all_products]

        # If no order history, pick a diverse curated set from different categories
        if not result:
            seen_cats = set()
            for p in get_all_products():
                cat = p.get('category', '')
                if cat not in seen_cats:
                    result.append(p)
                    seen_cats.add(cat)
                if len(result) >= limit:
                    break

        return result[:limit]
    finally:
        release_connection(conn)

def get_personalized_recommendations(phone: str, limit: int = 12) -> list:
    """Return personalized recommendations for a logged-in user."""
    prefs = get_category_preferences(phone)
    all_products = get_all_products()
    favorite_ids = set(get_favorites(phone))

    if not prefs:
        # No history: fall back to trending
        return get_trending_products(limit)

    result = []
    seen_ids = set()
    top_cats = list(prefs.keys())[:5]  # Top 5 preferred categories

    # Pick products from preferred categories (exclude already favorited ones to show new things)
    for cat in top_cats:
        cat_products = [p for p in all_products if p.get('category') == cat and p['id'] not in seen_ids]
        # Mix: some favorited, mostly new picks
        picks = cat_products[:3]
        for p in picks:
            result.append(p)
            seen_ids.add(p['id'])
        if len(result) >= limit:
            break

    # Fill remaining slots with trending if needed
    if len(result) < limit:
        trending = get_trending_products(limit * 2)
        for p in trending:
            if p['id'] not in seen_ids:
                result.append(p)
                seen_ids.add(p['id'])
            if len(result) >= limit:
                break

    return result[:limit]
