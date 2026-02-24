# ============================================================
# database.py — SQLite Database Setup & Seed Data
# ============================================================
import sqlite3
import os
import json
import time
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_URL", "store.db")

# ── Product cache ─────────────────────────────────────────
_products_cache = None
_products_cache_time = 0

def _invalidate_products_cache():
    global _products_cache
    _products_cache = None

def get_connection():
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Create tables, run migrations, and reseed products."""
    conn = get_connection()
    cursor = conn.cursor()

    # ── Products table ────────────────────────────────────
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            items_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Processing',
            total REAL NOT NULL,
            timestamp TEXT NOT NULL,
            address TEXT
        )
    """)

    # ── Customers table (OTP auth) ────────────────────────
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

    # ── Safe column migrations ────────────────────────────
    migrations = [
        ("orders", "delivery_type", "TEXT NOT NULL DEFAULT 'pickup'"),
        ("orders", "delivery_time", "TEXT NOT NULL DEFAULT 'same_day'"),
        ("orders", "delivered_at",  "TEXT"),
        ("orders", "address",       "TEXT"),
        ("orders", "delivery_otp",  "TEXT"),
        ("products", "base_name",   "TEXT NOT NULL DEFAULT ''"),
        ("products", "unit",        "TEXT NOT NULL DEFAULT 'kg'"),
        ("customers", "name",       "TEXT"),
        ("customers", "email",      "TEXT"),
        ("customers", "address",    "TEXT"),
        ("customers", "cancel_timestamps", "TEXT DEFAULT '[]'"),
    ]
    for table, col, defn in migrations:
        try:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} {defn}")
        except Exception:
            pass  # column already exists

    # ── Initialize counter ────────────────────────────────
    cursor.execute(
        "INSERT OR IGNORE INTO counters (name, value) VALUES ('order_token', 100)"
    )

    # ── Always reseed products ────────────────────────────
    cursor.execute("DELETE FROM products")
    try:
        cursor.execute("DELETE FROM sqlite_sequence WHERE name='products'")
    except Exception:
        pass
    _seed_products(cursor)

    conn.commit()
    conn.close()
    _invalidate_products_cache()

def _seed_products(cursor):
    """Seed grain products with base_name for variant grouping."""
    RICE_IMG   = "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop"
    WHEAT_IMG  = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop"
    JOWARI_IMG = "https://images.unsplash.com/photo-1596547609652-9fc5d8d428ce?w=400&h=300&fit=crop"
    BAJRI_IMG  = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop"
    PULSES_IMG = "https://images.unsplash.com/photo-1585996611354-972a9e34c901?w=400&h=300&fit=crop"

    products = [
        # ── Rice variants ─────────────────────────────────
        ("Vadakolam Rice",      68,  "₹68/kg — Premium quality",   RICE_IMG,   "Rice",   "Vadakolam Rice"),
        ("Vadakolam Rice",      72,  "₹72/kg — Premium quality",   RICE_IMG,   "Rice",   "Vadakolam Rice"),
        ("Vadakolam Rice",      76,  "₹76/kg — Premium quality",   RICE_IMG,   "Rice",   "Vadakolam Rice"),
        ("Vadakolam Rice",      80,  "₹80/kg — Premium quality",   RICE_IMG,   "Rice",   "Vadakolam Rice"),
        ("MassorieKolam Rice",  44,  "₹44/kg — Premium quality",   RICE_IMG,   "Rice",   "MassorieKolam Rice"),
        ("Parimal Rice",        42,  "₹42/kg — Premium quality",   RICE_IMG,   "Rice",   "Parimal Rice"),
        ("Boiled Rice",         58,  "₹58/kg — Premium quality",   RICE_IMG,   "Rice",   "Boiled Rice"),
        ("Boiled Kolam Rice",   60,  "₹60/kg — Premium quality",   RICE_IMG,   "Rice",   "Boiled Kolam Rice"),
        ("Basmati Rice",        99,  "₹99/kg — Premium quality",   RICE_IMG,   "Rice",   "Basmati Rice"),
        ("Basmati Rice",       120,  "₹120/kg — Premium quality",  RICE_IMG,   "Rice",   "Basmati Rice"),
        ("Basmati Rice",       180,  "₹180/kg — Premium quality",  RICE_IMG,   "Rice",   "Basmati Rice"),
        ("Basmati Rice",       220,  "₹220/kg — Premium quality",  RICE_IMG,   "Rice",   "Basmati Rice"),
        ("Broken Basmati",      60,  "₹60/kg — Premium quality",   RICE_IMG,   "Rice",   "Broken Basmati"),
        ("Broken Basmati",      67,  "₹67/kg — Premium quality",   RICE_IMG,   "Rice",   "Broken Basmati"),
        ("Broken Basmati",      77,  "₹77/kg — Premium quality",   RICE_IMG,   "Rice",   "Broken Basmati"),
        ("Ambemore Rice",      220,  "₹220/kg — Premium quality",  RICE_IMG,   "Rice",   "Ambemore Rice"),
        ("Indrani Rice",        66,  "₹66/kg — Premium quality",   RICE_IMG,   "Rice",   "Indrani Rice"),
        ("Indrani Rice",        74,  "₹74/kg — Premium quality",   RICE_IMG,   "Rice",   "Indrani Rice"),
        ("Italy Rice",          52,  "₹52/kg — Premium quality",   RICE_IMG,   "Rice",   "Italy Rice"),
        ("Red Rice",            66,  "₹66/kg — Premium quality",   RICE_IMG,   "Rice",   "Red Rice"),
        ("Brown Rice",         126,  "₹126/kg — Premium quality",  RICE_IMG,   "Rice",   "Brown Rice"),

        # ── Daals & Pulses (New) ──────────────────────────
        ("Toordal",             109, "₹109/kg — Essential Lentil", PULSES_IMG, "Daals & Pulses", "Toordal"),
        ("Toordal",             196, "₹196/kg — Priority Grade",   PULSES_IMG, "Daals & Pulses", "Toordal"),
        ("Toordal",             220, "₹220/kg — Premium Grade",    PULSES_IMG, "Daals & Pulses", "Toordal"),
        ("Toordal",             280, "₹280/kg — Export Quality",   PULSES_IMG, "Daals & Pulses", "Toordal"),

        ("Moongdal",            109, "₹109/kg — Fresh",            PULSES_IMG, "Daals & Pulses", "Moongdal"),
        ("Moongdal",            180, "₹180/kg — Premium",          PULSES_IMG, "Daals & Pulses", "Moongdal"),
        
        ("Chana dal",            88, "₹88/kg — Standard",          PULSES_IMG, "Daals & Pulses", "Chana dal"),
        ("Chana dal",           108, "₹108/kg — Premium",          PULSES_IMG, "Daals & Pulses", "Chana dal"),
        
        ("Udid dal",            120, "₹120/kg — Quality Sort",     PULSES_IMG, "Daals & Pulses", "Udid dal"),
        ("Udid dal",            196, "₹196/kg — Premium",          PULSES_IMG, "Daals & Pulses", "Udid dal"),
        
        ("Masoor dal",          120, "₹120/kg — Farm Fresh",       PULSES_IMG, "Daals & Pulses", "Masoor dal"),
        ("Chilti Moongdal",     160, "₹160/kg — Quality Select",   PULSES_IMG, "Daals & Pulses", "Chilti Moongdal"),
        
        ("Moong",               200, "₹200/kg — 1kg bag",          PULSES_IMG, "Daals & Pulses", "Moong (Whole)"),
        ("Moong - 500g",        100, "₹100/500g — Half kg bag",    PULSES_IMG, "Daals & Pulses", "Moong (Whole)"),
        
        ("Mataki - 500g",        70, "₹70/500g",                   PULSES_IMG, "Daals & Pulses", "Mataki"),
        ("Mataki - 250g",        35, "₹35/250g",                   PULSES_IMG, "Daals & Pulses", "Mataki"),
        
        ("Masur - 500g",         60, "₹60/500g",                   PULSES_IMG, "Daals & Pulses", "Masur"),
        ("Masur - 250g",         30, "₹30/250g",                   PULSES_IMG, "Daals & Pulses", "Masur"),
        
        ("Chana - 500g",         60, "₹60/500g",                   PULSES_IMG, "Daals & Pulses", "Chana"),
        ("Chana - 250g",         30, "₹30/250g",                   PULSES_IMG, "Daals & Pulses", "Chana"),
        
        ("Kabuli Chana - 500g", 110, "₹110/500g",                  PULSES_IMG, "Daals & Pulses", "Kabuli Chana"),
        ("Kabuli Chana - 250g",  55, "₹55/250g",                   PULSES_IMG, "Daals & Pulses", "Kabuli Chana"),
        
        ("Chawali - 500g",       90, "₹90/500g",                   PULSES_IMG, "Daals & Pulses", "Chawali"),
        ("Chawali - 250g",       45, "₹45/250g",                   PULSES_IMG, "Daals & Pulses", "Chawali"),
        
        ("White Vatana - 500g",  80, "₹80/500g",                   PULSES_IMG, "Daals & Pulses", "White Vatana"),
        ("White Vatana - 250g",  40, "₹40/250g",                   PULSES_IMG, "Daals & Pulses", "White Vatana"),
        
        ("Green Vatana - 500g",  80, "₹80/500g",                   PULSES_IMG, "Daals & Pulses", "Green Vatana"),
        ("Green Vatana - 250g",  40, "₹40/250g",                   PULSES_IMG, "Daals & Pulses", "Green Vatana"),
        
        ("Black Vatana - 500g",  80, "₹80/500g",                   PULSES_IMG, "Daals & Pulses", "Black Vatana"),
        ("Black Vatana - 250g",  40, "₹40/250g",                   PULSES_IMG, "Daals & Pulses", "Black Vatana"),

        # ── 250g Specific Variants ────────────────────────
        ("Matki Dal - 250g",     45, "₹45/250g",                   PULSES_IMG, "Daals & Pulses", "Matki Dal"),
        ("Waal Dal - 250g",      80, "₹80/250g",                   PULSES_IMG, "Daals & Pulses", "Waal Dal"),
        ("Chavli Dal - 250g",    60, "₹60/250g",                   PULSES_IMG, "Daals & Pulses", "Chavli Dal"),
        ("Mix Dal - 250g",       49, "₹49/250g",                   PULSES_IMG, "Daals & Pulses", "Mix Dal"),
        ("Black Udid - 250g",    38, "₹38/250g",                   PULSES_IMG, "Daals & Pulses", "Black Udid"),
        ("Green Chana - 250g",   50, "₹50/250g",                   PULSES_IMG, "Daals & Pulses", "Green Chana"),
        ("Mosambi Chana - 250g", 45, "₹45/250g",                   PULSES_IMG, "Daals & Pulses", "Mosambi Chana"),
        ("Rajma Black - 250g",   50, "₹50/250g",                   PULSES_IMG, "Daals & Pulses", "Rajma Black"),
        ("Red Chawali - 250g",   50, "₹50/250g",                   PULSES_IMG, "Daals & Pulses", "Red Chawali"),
        ("Kadve Waal - 250g",    65, "₹65/250g",                   PULSES_IMG, "Daals & Pulses", "Kadve Waal"),
        ("Wal - 250g",           50, "₹50/250g",                   PULSES_IMG, "Daals & Pulses", "Wal"),
        ("Rajma White - 250g",   50, "₹50/250g",                   PULSES_IMG, "Daals & Pulses", "Rajma White"),
        ("Barik Chawali - 250g", 65, "₹65/250g",                   PULSES_IMG, "Daals & Pulses", "Barik Chawali"),
        ("Black Urad - 250g",    40, "₹40/250g",                   PULSES_IMG, "Daals & Pulses", "Black Urad (Whole)"),
        ("Soyabean - 250g",      40, "₹40/250g",                   PULSES_IMG, "Daals & Pulses", "Soyabean"),
        ("Kulid - 250g",         35, "₹35/250g",                   PULSES_IMG, "Daals & Pulses", "Kulid"),
        # ── Wheat variants ────────────────────────────────
        ("Lokvan Wheat",        45,  "₹45/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "Lokvan Wheat"),
        ("Lokvan Wheat",        52,  "₹52/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "Lokvan Wheat"),
        ("Lokvan Wheat",        56,  "₹56/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "Lokvan Wheat"),
        ("MPSIOR Wheat",        48,  "₹48/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "MPSIOR Wheat"),
        ("MPSIOR Wheat",        52,  "₹52/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "MPSIOR Wheat"),
        ("MPSIOR Wheat",        72,  "₹72/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "MPSIOR Wheat"),
        ("MPSIOR Wheat",        76,  "₹76/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "MPSIOR Wheat"),
        ("MPSIOR Wheat",        80,  "₹80/kg — Premium quality",   WHEAT_IMG,  "Wheat",  "MPSIOR Wheat"),
        ("KhapliWheat",        120,  "₹120/kg — Premium quality",  WHEAT_IMG,  "Wheat",  "KhapliWheat"),
        # ── Jowari variants ───────────────────────────────
        ("Jowari",              54,  "₹54/kg — Premium quality",   JOWARI_IMG, "Jowari", "Jowari"),
        ("Jowari",              60,  "₹60/kg — Premium quality",   JOWARI_IMG, "Jowari", "Jowari"),
        ("Jowari",              90,  "₹90/kg — Premium quality",   JOWARI_IMG, "Jowari", "Jowari"),
        # ── Bajri ─────────────────────────────────────────
        ("Bajri",               56,  "₹56/kg — Premium quality",   BAJRI_IMG,  "Bajri",  "Bajri"),
    ]

    # Derive unit from name explicitly
    final_products = []
    for p in products:
        name = p[0]
        unit_val = "kg"
        if "250g" in name or "250g" in p[2]:
            unit_val = "250g"
        elif "500g" in name or "500g" in p[2]:
            unit_val = "500g"
        final_products.append((*p, unit_val))

    cursor.executemany(
        "INSERT INTO products (name, price, description, image_url, category, base_name, unit) VALUES (?,?,?,?,?,?,?)",
        final_products,
    )

def get_all_products():
    """Fetch all products (5-min in-memory cache)."""
    global _products_cache, _products_cache_time
    now = time.time()
    if _products_cache is not None and (now - _products_cache_time) < 300:
        return _products_cache
    conn = get_connection()
    rows = conn.execute("SELECT * FROM products ORDER BY category, base_name, price").fetchall()
    conn.close()
    _products_cache = [dict(row) for row in rows]
    _products_cache_time = now
    return _products_cache

# ── Customer OTP auth ─────────────────────────────────────

def get_customer(phone: str):
    """Fetch customer record by phone."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_customer_by_email(email: str):
    """Fetch customer record by email."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM customers WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None

def create_or_update_customer(phone: str, name: str = None, email: str = None, address: str = None, pin_hash: str = None):
    """Insert or update customer details."""
    conn = get_connection()
    existing = get_customer(phone)
    if existing:
        # Update existing
        if name or email or address or pin_hash:
            query = "UPDATE customers SET "
            params = []
            if name:
                query += "name = ?, "
                params.append(name)
            if email:
                query += "email = ?, "
                params.append(email)
            if address:
                query += "address = ?, "
                params.append(address)
            if pin_hash:
                query += "pin_hash = ?, "
                params.append(pin_hash)
            
            query = query.rstrip(', ')
            query += " WHERE phone = ?"
            params.append(phone)
            conn.execute(query, tuple(params))
    else:
        # Insert new
        conn.execute(
            "INSERT INTO customers (phone, name, email, address, pin_hash, cancel_timestamps, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (phone, name, email, address, pin_hash, "[]", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
    conn.commit()
    conn.close()

def update_customer_cancels(phone: str, cancel_timestamps_json: str):
    """Update a customer's cancel timestamps JSON string."""
    conn = get_connection()
    conn.execute("UPDATE customers SET cancel_timestamps = ? WHERE phone = ?", (cancel_timestamps_json, phone))
    conn.commit()
    conn.close()

def get_all_customers():
    """Fetch all signed-up customers."""
    conn = get_connection()
    rows = conn.execute("SELECT phone, name, address, created_at FROM customers ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

# ── Orders ────────────────────────────────────────────────

def create_order(phone: str, items: list, total: float, delivery_type: str = "pickup", delivery_time: str = "same_day", address: str = None) -> str:
    """Create a new order and return the generated token."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE counters SET value = value + 1 WHERE name = 'order_token'"
    )
    cursor.execute("SELECT value FROM counters WHERE name = 'order_token'")
    token_num = cursor.fetchone()[0]
    token = str(token_num)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    items_json = json.dumps(items)
    
    import random
    delivery_otp = str(random.randint(1000, 9999)) if delivery_type == "delivery" else None

    cursor.execute(
        "INSERT INTO orders (token, phone, items_json, status, total, timestamp, delivery_type, delivery_time, address, delivery_otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (token, phone, items_json, "Processing", total, timestamp, delivery_type, delivery_time, address, delivery_otp),
    )

    conn.commit()
    conn.close()
    return token

def get_all_orders():
    """Fetch all orders (newest first) with customer names."""
    conn = get_connection()
    query = '''
        SELECT o.*, c.name as customer_name 
        FROM orders o 
        LEFT JOIN customers c ON o.phone = c.phone 
        ORDER BY o.id DESC
    '''
    rows = conn.execute(query).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_order_by_token(token: str):
    """Fetch a single order by token with customer name."""
    conn = get_connection()
    query = '''
        SELECT o.*, c.name as customer_name 
        FROM orders o 
        LEFT JOIN customers c ON o.phone = c.phone 
        WHERE o.token = ?
    '''
    row = conn.execute(query, (token,)).fetchone()
    conn.close()
    return dict(row) if row else None

def get_orders_by_phone(phone: str):
    """Fetch all orders for a customer by phone (newest first)."""
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM orders WHERE phone = ? ORDER BY id DESC", (phone,)
    ).fetchall()
    conn.close()
    return [dict(row) for row in rows]

def update_order_status(token: str, status: str) -> bool:
    """Update order status. Returns True if updated."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE token = ?", (status, token))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated

def mark_delivered(token: str) -> bool:
    """Mark an order as Delivered with timestamp."""
    conn = get_connection()
    cursor = conn.cursor()
    delivered_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute(
        "UPDATE orders SET status = 'Delivered', delivered_at = ? WHERE token = ?",
        (delivered_at, token)
    )
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated
