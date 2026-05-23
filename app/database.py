import psycopg2  # type: ignore
from psycopg2 import extras, pool  # type: ignore
import os
import json
import time
import html
import re
from datetime import datetime
from typing import Optional

DATABASE_URL = os.getenv("DATABASE_URL")

# ── Product cache ─────────────────────────────────────────
_products_cache = None
_products_cache_time = 0

def _invalidate_products_cache():
    global _products_cache
    _products_cache = None

def _update_cache_item(product_id, updates):
    """Update a single item in the in-memory cache to avoid full re-fetches."""
    global _products_cache
    if _products_cache is not None:
        for p in _products_cache:
            if p.get('id') == product_id:
                p.update(updates)
                break

_db_pool = None

def init_pool():
    global _db_pool
    url = os.getenv("DATABASE_URL")
    if not url:
        raise ValueError("DATABASE_URL environment variable is not set")
    
    # Auto-switch to Supabase transaction bouncer port (6543) for serverless stability
    if "supabase.com" in url and ":5432" in url:
        print("Switching to Supabase transaction bouncer port (6543) for better performance.")
        url = url.replace(":5432", ":6543")

    if _db_pool is None:
        max_init_retries = 2
        for attempt in range(max_init_retries):
            try:
                print(f"Initializing Postgres Pool (Attempt {attempt+1})...")
                # Small pool, fast timeout for serverless
                _db_pool = pool.ThreadedConnectionPool(
                    1, 10, url, 
                    cursor_factory=extras.RealDictCursor, 
                    connect_timeout=10
                )
                print("Connection Pool Initialized.")
                break
            except Exception as e:
                print(f"Pool initialization failed: {e}")
                if attempt == max_init_retries - 1:
                    raise e
                time.sleep(1)

def get_connection():
    """Get a PostgreSQL connection with retry logic."""
    if _db_pool is None:
        init_pool()
    assert _db_pool is not None
    
    max_retries = 3
    last_err = None
    for attempt in range(max_retries):
        try:
            return _db_pool.getconn()
        except Exception as e:
            last_err = e
            print(f"Connection attempt {attempt+1} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(1) # Wait before retry
    
    raise last_err or Exception("Could not get connection from pool")

def release_connection(conn):
    if _db_pool is not None and conn is not None:
        try:
            _db_pool.putconn(conn)
        except Exception as e:
            print(f"Error releasing connection: {e}")

def init_db():
    """Create tables and run migrations in a single batch to minimize latency."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # Combine all schema setup into one multi-statement block
        setup_sql = """
            -- Products table
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                price REAL NOT NULL,
                mrp REAL NOT NULL DEFAULT 0.0,
                description TEXT NOT NULL,
                image_url TEXT NOT NULL,
                category TEXT NOT NULL,
                sub_category TEXT NOT NULL DEFAULT '',
                base_name TEXT NOT NULL DEFAULT '',
                unit TEXT NOT NULL DEFAULT 'kg',
                is_visible BOOLEAN NOT NULL DEFAULT TRUE,
                in_stock BOOLEAN NOT NULL DEFAULT TRUE,
                is_newly_launched BOOLEAN NOT NULL DEFAULT FALSE
            );

            -- Migrations for products
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='mrp') THEN
                    ALTER TABLE products ADD COLUMN mrp REAL NOT NULL DEFAULT 0.0;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='sub_category') THEN
                    ALTER TABLE products ADD COLUMN sub_category TEXT NOT NULL DEFAULT '';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_visible') THEN
                    ALTER TABLE products ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='in_stock') THEN
                    ALTER TABLE products ADD COLUMN in_stock BOOLEAN NOT NULL DEFAULT TRUE;
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='is_newly_launched') THEN
                    ALTER TABLE products ADD COLUMN is_newly_launched BOOLEAN NOT NULL DEFAULT FALSE;
                END IF;
            END $$;

            -- Fix any 0.0 or null MRPs to match price
            UPDATE products SET mrp = price WHERE mrp = 0.0 OR mrp IS NULL;

            -- Orders table
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
                delivery_otp TEXT,
                payment_method TEXT NOT NULL DEFAULT 'cod',
                payment_status TEXT NOT NULL DEFAULT 'pending'
            );

            -- Migrations for orders payment columns
            DO $$ BEGIN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_method') THEN
                    ALTER TABLE orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cod';
                END IF;
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='payment_status') THEN
                    ALTER TABLE orders ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';
                END IF;
            END $$;

            -- Customers table
            CREATE TABLE IF NOT EXISTS customers (
                phone TEXT PRIMARY KEY,
                name TEXT,
                email TEXT,
                address TEXT,
                pin_hash TEXT,
                cancel_timestamps TEXT DEFAULT '[]',
                created_at TEXT NOT NULL
            );

            -- Token counter
            CREATE TABLE IF NOT EXISTS counters (
                name TEXT PRIMARY KEY,
                value INTEGER NOT NULL DEFAULT 100
            );
            INSERT INTO counters (name, value) VALUES ('order_token', 100) ON CONFLICT DO NOTHING;

            -- Favorites
            CREATE TABLE IF NOT EXISTS customer_favorites (
                phone TEXT NOT NULL,
                product_id INTEGER NOT NULL,
                added_at TEXT NOT NULL,
                PRIMARY KEY (phone, product_id)
            );
        """
        cursor.execute(setup_sql)
        
        # Check product count for conditional seeding
        cursor.execute("SELECT COUNT(*) as count FROM products")
        row = cursor.fetchone()
        count = row['count'] if row else 0
        
        force_reseed = os.getenv("RESEED_DB", "false").lower() == "true"
        
        if count == 0 or force_reseed:
            if force_reseed:
                print("RESEED_DB=true detected. Forcing reseed...")
            else:
                print("Database empty. Initializing products...")
                
            cursor.execute("TRUNCATE TABLE products RESTART IDENTITY")
            _seed_products(cursor)
        else:
            print(f"Products already exist ({count} items). Skipping seeding.")

        conn.commit()
    except Exception as e:
        print(f"Database initialization failed: {e}")
        if conn: conn.rollback()
    finally:
        if conn: release_connection(conn)
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

    PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=="

    CATEGORY_IMAGES = {
        "Atta, Rice & Dal":         PLACEHOLDER,
        "Masala & Dry Fruits":      PLACEHOLDER,
        "Snacks & Munchies":        PLACEHOLDER,
        "Sweet Tooth":              PLACEHOLDER,
        "Cleaning Essentials":      PLACEHOLDER,
        "Instant & Frozen Food":    PLACEHOLDER,
        "Dairy & Bread":           PLACEHOLDER,
        "Personal Care":            PLACEHOLDER,
        "Cold Drinks & Juices":     PLACEHOLDER,
        "Wellness":                 PLACEHOLDER,
        "Tea, Coffee & Health Drinks": PLACEHOLDER,
        "Paan Corner":              PLACEHOLDER,
        "Pantry Staples":           PLACEHOLDER,
        "Baby Care":                PLACEHOLDER,
        "Home & Lifestyle":         PLACEHOLDER,
        "Pooja Needs":              PLACEHOLDER,
        "Rice":                     PLACEHOLDER,
        "Wheat":                    PLACEHOLDER,
        "Jowari":                   PLACEHOLDER,
        "Bajri":                    PLACEHOLDER,
        "Default":                  PLACEHOLDER
    }

    def get_image(category):
        return CATEGORY_IMAGES.get(category, CATEGORY_IMAGES["Default"])

    # Blocked categories — exclude irrelevant
    BLOCKED_CATEGORIES = {'Pet Supplies', 'Books & Media', 'Stationery', 'Packaging & Carry Bags'}

    final_products = []  # (name, price, mrp, description, image_url, category, sub_category, base_name, unit)

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
                        mrp = float(row.get('mrp') or 0)
                        price = mrp # Default selling price to MRP
                    except (ValueError, TypeError):
                        mrp = 0.0
                        price = 0.0

                    if price <= 0 or not name:
                        continue

                    # Derive unit from Size_Weight using regex for robustness
                    # Handles values like: 100g, 200G, 1kg, 500ml, 1L, 250Gm, pc, etc.
                    sw_stripped = size_weight.strip()
                    sw_lower = sw_stripped.lower()
                    _unit_match = re.match(
                        r'^(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|ltrs|litre|litres|pc|pcs|piece|pieces)$',
                        sw_lower
                    )
                    if _unit_match:
                        qty, utype = _unit_match.group(1), _unit_match.group(2)
                        # Normalise unit labels
                        if utype in ('kg', 'kgs'):
                            unit = f'{qty}kg'
                        elif utype in ('g', 'gm', 'gms', 'gram', 'grams'):
                            unit = f'{qty}g'
                        elif utype in ('l', 'ltr', 'ltrs', 'litre', 'litres'):
                            unit = f'{qty}L'
                        elif utype == 'ml':
                            unit = f'{qty}ml'
                        else:  # pc / pcs / piece / pieces
                            unit = f'{qty} pcs' if qty != '1' else 'pc'
                    elif sw_lower in ('pc', 'pcs', 'piece', 'pieces'):
                        unit = 'pc'
                    elif sw_stripped and sw_lower not in ('nan', ''):
                        unit = sw_stripped  # raw fallback (e.g. "Assorted")
                    else:
                        unit = 'pcs'

                    description = f"₹{int(price)}/{unit} — {sub_category}" if sub_category else f"₹{int(price)}/{unit}"
                    img_url = get_image(category)

                    final_products.append((name, price, mrp, description, img_url, category, sub_category, base_name, unit))

            print(f"Loaded {len(final_products)} products from ULTIMATE_ZEPTO_CATALOG.csv.")
        except Exception as e:
            print(f"Error during CSV parsing: {e}")
    else:
        print(f"CSV not found at {csv_file_path}.")

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
                mrp = price
                final_products.append((name, price, mrp, description, img_url, mapped_category, sub_category, base_name or name, unit))
            print(f"Loaded {len(sqlite_rows)} products from store.db.")
        except Exception as e:
            print(f"Error during SQLite parsing: {e}")
    else:
        print(f"store.db not found at {sqlite_db_path}.")

    # 3. Insert all into PostgreSQL
    if final_products:
        try:
            cursor.executemany(
                "INSERT INTO products (name, price, mrp, description, image_url, category, sub_category, base_name, unit, is_visible, in_stock, is_newly_launched) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s, TRUE, TRUE, FALSE)",
                final_products,
            )
            print(f"Successfully seeded {len(final_products)} products into database.")
        except Exception as e:
            print(f"Error during PostgreSQL insertion: {e}")
    else:
        print("No products found to seed.")

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
    existing = get_customer(phone)
    conn = get_connection()
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

def create_order(phone: str, items: list, total: float, delivery_type: str = "pickup", delivery_time: str = "same_day", address: "Optional[str]" = None, payment_method: str = "cod") -> str:
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
        
        # Payment status: UPI orders start as 'pending', COD orders as 'cod'
        payment_status = "pending" if payment_method == "upi" else "cod"
        
        # Delivery OTP: for UPI it's generated later by admin. For COD it's generated now.
        import random
        delivery_otp = None
        if delivery_type == "delivery" and payment_method == "cod":
            delivery_otp = str(random.randint(1000, 9999))

        cursor.execute(
            "INSERT INTO orders (token, phone, items_json, status, total, timestamp, delivery_type, delivery_time, address, delivery_otp, payment_method, payment_status) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (token, phone, items_json, "Processing", total, timestamp, delivery_type, delivery_time, address, delivery_otp, payment_method, payment_status),
        )

        conn.commit()
        return token, delivery_otp
    finally:
        release_connection(conn)

def confirm_payment_and_generate_otp(order_token: str) -> "Optional[str]":
    """Admin action: mark payment as received, generate secure delivery OTP.
    Returns the plain-text OTP for delivery orders, or None for pickup."""
    import secrets
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Fetch order to check delivery_type
        cursor.execute("SELECT delivery_type, payment_status FROM orders WHERE token = %s", (order_token,))
        row = cursor.fetchone()
        if not row:
            return None

        delivery_type = row['delivery_type']
        # Generate a 4-digit OTP only for delivery orders
        plain_otp = None
        if delivery_type == 'delivery':
            plain_otp = str(secrets.randbelow(9000) + 1000)  # Crypto-secure 1000–9999

        cursor.execute(
            "UPDATE orders SET payment_status = 'paid', delivery_otp = %s, status = 'Ready for Pickup' WHERE token = %s",
            (plain_otp, order_token)
        )
        conn.commit()
        _invalidate_products_cache()
        return plain_otp
    except Exception as e:
        print(f"Error confirming payment for {order_token}: {e}")
        if conn: conn.rollback()
        return None
    finally:
        release_connection(conn)

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

def reject_order_payment(token: str) -> bool:
    """Explicitly mark a payment as rejected/unverified."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE orders SET payment_status = 'rejected' WHERE token = %s",
            (token,)
        )
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

def clean_html_entities(text: str) -> str:
    if not text:
        return ""
    prev = ""
    curr = str(text)
    while curr != prev:
        prev = curr
        curr = html.unescape(prev)
    return curr.strip()

def add_product(name: str, price: float, mrp: float, description: str, image_url: str, category: str, sub_category: str = "", base_name: str = "", unit: str = "kg", is_newly_launched: bool = False) -> Optional[int]:
    """Add a new product to the database."""
    category = clean_html_entities(category)
    sub_category = clean_html_entities(sub_category)
    if mrp is None or mrp <= 0.0:
        mrp = price
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO products (name, price, mrp, description, image_url, category, sub_category, base_name, unit, is_visible, in_stock, is_newly_launched) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, TRUE, TRUE, %s) RETURNING id",
            (name, price, mrp, description, image_url, category, sub_category, base_name, unit, is_newly_launched)
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
    
    # Ensure MRP is not updated to 0.0 or <= 0
    if 'mrp' in updates and (updates['mrp'] is None or updates['mrp'] <= 0.0):
        if 'price' in updates:
            updates['mrp'] = updates['price']
        else:
            updates.pop('mrp', None)
            
    # Clean HTML entities if category or sub_category are updated
    if 'category' in updates and updates['category']:
        updates['category'] = clean_html_entities(updates['category'])
    if 'sub_category' in updates and updates['sub_category']:
        updates['sub_category'] = clean_html_entities(updates['sub_category'])

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
        # Instead of clearing everything, just update the one item
        _update_cache_item(product_id, updates)
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
    all_products = {p['id']: p for p in get_all_products()}
    favorite_ids = get_favorites(phone)
    
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
        for fid in favorite_ids:
            if fid in all_products:
                cat = all_products[fid].get('category', '')
                weights[cat] = weights.get(cat, 0) + 2

        return dict(sorted(weights.items(), key=lambda x: x[1], reverse=True))
    finally:
        release_connection(conn)

_trending_cache = {
    "products": None,
    "timestamp": 0.0
}
TRENDING_CACHE_TTL = 3600  # 1 hour cache TTL

def get_trending_products(limit: int = 12) -> list:
    """Return most-ordered products for trending/guest recommendations with high-performance caching."""
    current_time = time.time()
    if _trending_cache["products"] is not None and (current_time - _trending_cache["timestamp"] < TRENDING_CACHE_TTL):
        return _trending_cache["products"][:limit]

    all_products = {p['id']: p for p in get_all_products()}
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
                if len(result) >= limit * 2:
                    break

        _trending_cache["products"] = result
        _trending_cache["timestamp"] = current_time
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

_orders_fbt_cache = {
    "orders": None,
    "timestamp": 0.0
}
ORDERS_FBT_CACHE_TTL = 3600

def get_frequently_bought_together(product_ids: list, limit: int = 4) -> list:
    """Analyze co-occurrence in orders of given product_ids to find highly associated cross-sell items."""
    if not product_ids:
        return []
    
    product_ids_set = set(int(pid) for pid in product_ids)
    all_products = {p['id']: p for p in get_all_products()}
    
    current_time = time.time()
    if _orders_fbt_cache["orders"] is not None and (current_time - _orders_fbt_cache["timestamp"] < ORDERS_FBT_CACHE_TTL):
        orders = _orders_fbt_cache["orders"]
    else:
        conn = get_connection()
        try:
            cursor = conn.cursor()
            # Fetch last 500 orders to construct high-quality associations
            cursor.execute("SELECT items_json FROM orders WHERE status != 'Cancelled' ORDER BY id DESC LIMIT 500")
            orders = cursor.fetchall()
            _orders_fbt_cache["orders"] = orders
            _orders_fbt_cache["timestamp"] = current_time
        except Exception:
            orders = []
        finally:
            release_connection(conn)

    co_occurrences = {}
    for order in orders:
        try:
            items = json.loads(order['items_json'])
            order_pids = set(int(item.get('product_id')) for item in items if item.get('product_id'))
            
            # Check if this order contains any of the input product_ids
            if order_pids.intersection(product_ids_set):
                # Count other items in this order
                for other_pid in order_pids:
                    if other_pid not in product_ids_set and other_pid in all_products:
                        co_occurrences[other_pid] = co_occurrences.get(other_pid, 0) + 1
        except Exception:
            pass

    sorted_pids = sorted(co_occurrences.keys(), key=lambda x: co_occurrences[x], reverse=True)
    
    # Return matched products
    result = [all_products[pid] for pid in sorted_pids if all_products[pid].get('is_visible') and all_products[pid].get('in_stock')]
    
    # If not enough, pad with trending
    if len(result) < limit:
        trending = get_trending_products(limit * 2)
        for p in trending:
            if p['id'] not in product_ids_set and p['id'] not in co_occurrences:
                result.append(p)
            if len(result) >= limit:
                break
                
    return result[:limit]

def get_smart_reorder_reminders(phone: str, limit: int = 6) -> list:
    """Analyze client order history to calculate product repurchase intervals and identify replenishment items."""
    all_products = {p['id']: p for p in get_all_products()}
    conn = get_connection()
    try:
        cursor = conn.cursor()
        # Fetch up to 50 historical orders for this client
        cursor.execute(
            "SELECT items_json, timestamp FROM orders WHERE phone = %s AND status != 'Cancelled' ORDER BY id DESC LIMIT 50",
            (phone,)
        )
        orders = cursor.fetchall()
        if not orders:
            return []

        # Map product_id to purchase timestamps
        product_purchase_dates = {}
        for order in orders:
            try:
                items = json.loads(order['items_json'])
                ts_str = order['timestamp']
                try:
                    dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
                except ValueError:
                    dt = datetime.strptime(ts_str[:19], "%Y-%m-%d %H:%M:%S")
                
                for item in items:
                    pid = item.get('product_id')
                    if pid and pid in all_products:
                        if pid not in product_purchase_dates:
                            product_purchase_dates[pid] = []
                        product_purchase_dates[pid].append(dt)
            except Exception:
                pass

        now = datetime.now()
        reorder_candidates = []

        for pid, dates in product_purchase_dates.items():
            if len(dates) < 1:
                continue
            
            # Sort chronologically
            dates.sort()
            last_purchase = dates[-1]
            days_since_last_purchase = (now - last_purchase).days

            # Calculate average interval if bought multiple times
            if len(dates) >= 2:
                intervals = []
                for i in range(len(dates) - 1):
                    intervals.append((dates[i+1] - dates[i]).days)
                avg_interval = max(3, sum(intervals) / len(intervals))
            else:
                # Default grocery replenishment cycle (14 days)
                avg_interval = 14.0

            # If within replenishment window: (interval - 3 days) to (interval + 14 days)
            if avg_interval - 3 <= days_since_last_purchase <= avg_interval + 14:
                # Calculate urgency score
                urgency = days_since_last_purchase / avg_interval
                reorder_candidates.append((pid, urgency))

        # Sort by highest urgency score
        reorder_candidates.sort(key=lambda x: x[1], reverse=True)
        
        result = [all_products[pid] for pid, _ in reorder_candidates if all_products[pid].get('is_visible') and all_products[pid].get('in_stock')]
        return result[:limit]
    except Exception as e:
        print(f"Error computing reorders: {e}")
        return []
    finally:
        release_connection(conn)

def get_similar_products(product_id: int, limit: int = 6) -> list:
    """Find products in the same category/sub-category with high keyword/n-gram title similarity."""
    all_products = get_all_products()
    ref_product = None
    for p in all_products:
        if p['id'] == product_id:
            ref_product = p
            break
            
    if not ref_product:
        return []

    ref_name = (ref_product.get('base_name') or ref_product.get('name') or "").lower()
    ref_words = set(re.findall(r'\w+', ref_name))
    
    # Filter products in the same category, excluding the product itself
    candidates = [
        p for p in all_products 
        if p.get('category') == ref_product.get('category') 
        and p['id'] != product_id 
        and p.get('is_visible') 
        and p.get('in_stock')
    ]

    scored_candidates = []
    for p in candidates:
        name = (p.get('base_name') or p.get('name') or "").lower()
        words = set(re.findall(r'\w+', name))
        
        # Calculate Jaccard similarity coefficient: Intersection / Union
        intersection = ref_words.intersection(words)
        union = ref_words.union(words)
        similarity = len(intersection) / len(union) if union else 0.0
        
        # Boost similarity score if subcategory matches
        if p.get('sub_category') and p.get('sub_category') == ref_product.get('sub_category'):
            similarity += 0.25
            
        scored_candidates.append((p, similarity))

    # Sort by similarity descending
    scored_candidates.sort(key=lambda x: x[1], reverse=True)
    
    # Return similar products
    return [p for p, _ in scored_candidates][:limit]
