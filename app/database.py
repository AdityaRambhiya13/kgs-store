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
            base_name TEXT NOT NULL DEFAULT ''
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
            address TEXT,
            pin_hash TEXT,
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
        ("orders", "delivered_at",  "TEXT"),
        ("orders", "address",       "TEXT"),
        ("orders", "delivery_otp",  "TEXT"),
        ("products", "base_name",   "TEXT NOT NULL DEFAULT ''"),
        ("customers", "name",       "TEXT"),
        ("customers", "address",    "TEXT"),
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
    JOWARI_IMG = "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=300&fit=crop"
    BAJRI_IMG  = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop"

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

    cursor.executemany(
        "INSERT INTO products (name, price, description, image_url, category, base_name) VALUES (?,?,?,?,?,?)",
        products,
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

def create_or_update_customer(phone: str, name: str = None, address: str = None, pin_hash: str = None):
    """Insert or update customer details."""
    conn = get_connection()
    existing = get_customer(phone)
    if existing:
        # Update existing
        if name or address or pin_hash:
            query = "UPDATE customers SET "
            params = []
            if name:
                query += "name = ?, "
                params.append(name)
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
            "INSERT INTO customers (phone, name, address, pin_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (phone, name, address, pin_hash, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
    conn.commit()
    conn.close()

def get_all_customers():
    """Fetch all signed-up customers."""
    conn = get_connection()
    rows = conn.execute("SELECT phone, name, address, created_at FROM customers ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

# ── Orders ────────────────────────────────────────────────

def create_order(phone: str, items: list, total: float, delivery_type: str = "pickup", address: str = None) -> str:
    """Create a new order and return the generated token."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "UPDATE counters SET value = value + 1 WHERE name = 'order_token'"
    )
    cursor.execute("SELECT value FROM counters WHERE name = 'order_token'")
    token_num = cursor.fetchone()[0]
    token = f"STORE-{token_num}"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    items_json = json.dumps(items)
    
    import random
    delivery_otp = str(random.randint(1000, 9999)) if delivery_type == "delivery" else None

    cursor.execute(
        "INSERT INTO orders (token, phone, items_json, status, total, timestamp, delivery_type, address, delivery_otp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (token, phone, items_json, "Processing", total, timestamp, delivery_type, address, delivery_otp),
    )

    conn.commit()
    conn.close()
    return token

def get_all_orders():
    """Fetch all orders (newest first)."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM orders ORDER BY id DESC").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_order_by_token(token: str):
    """Fetch a single order by token."""
    conn = get_connection()
    row = conn.execute("SELECT * FROM orders WHERE token = ?", (token,)).fetchone()
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
