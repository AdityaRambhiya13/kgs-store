# ============================================================
# database.py — SQLite Database Setup & Seed Data
# ============================================================
import sqlite3
import os
import json
from datetime import datetime

DATABASE_PATH = os.getenv("DATABASE_URL", "store.db")

def get_connection():
    """Get a SQLite connection with row factory."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn

def init_db():
    """Create tables and seed data if not exists."""
    conn = get_connection()
    cursor = conn.cursor()

    # Products table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            category TEXT NOT NULL
        )
    """)

    # Orders table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL UNIQUE,
            phone TEXT NOT NULL,
            items_json TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'Processing',
            total REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)

    # Token counter table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS counters (
            name TEXT PRIMARY KEY,
            value INTEGER NOT NULL DEFAULT 100
        )
    """)

    # Initialize counter if not exists
    cursor.execute(
        "INSERT OR IGNORE INTO counters (name, value) VALUES ('order_token', 100)"
    )

    # Seed products if empty
    cursor.execute("SELECT COUNT(*) FROM products")
    count = cursor.fetchone()[0]
    if count == 0:
        _seed_products(cursor)

    conn.commit()
    conn.close()

def _seed_products(cursor):
    """Insert 20 sample general store products."""
    products = [
        ("Taza Milk (500ml)", 28, "Fresh pasteurized toned milk, daily delivery", "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop", "Dairy"),
        ("White Bread Loaf", 45, "Soft sliced white bread, freshly baked", "https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=400&h=300&fit=crop", "Bakery"),
        ("Basmati Rice (1kg)", 85, "Premium aged long-grain basmati rice", "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop", "Grains"),
        ("Sunflower Oil (1L)", 150, "Refined sunflower cooking oil, heart-healthy", "https://images.unsplash.com/photo-1474979266404-7eadbdf060bf?w=400&h=300&fit=crop", "Cooking"),
        ("Toor Dal (1kg)", 120, "Split pigeon peas, protein-rich staple", "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop", "Pulses"),
        ("Sugar (1kg)", 48, "Fine crystal white sugar", "https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=400&h=300&fit=crop", "Essentials"),
        ("Amul Butter (100g)", 56, "Pasteurized salted butter, creamy & fresh", "https://images.unsplash.com/photo-1589985270826-4b7bb135bc0d?w=400&h=300&fit=crop", "Dairy"),
        ("Red Chilli Powder (200g)", 65, "Spicy Kashmiri red chilli powder", "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=400&h=300&fit=crop", "Spices"),
        ("Turmeric Powder (200g)", 42, "Pure haldi powder for cooking & health", "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400&h=300&fit=crop", "Spices"),
        ("Tea Leaves (250g)", 110, "Premium CTC Assam tea leaves", "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400&h=300&fit=crop", "Beverages"),
        ("Wheat Atta (5kg)", 220, "Whole wheat flour, stone-ground fresh", "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop", "Grains"),
        ("Salt (1kg)", 20, "Iodized refined salt, daily essential", "https://images.unsplash.com/photo-1518110925495-5fe2c8215e5d?w=400&h=300&fit=crop", "Essentials"),
        ("Eggs (12 pcs)", 78, "Farm-fresh brown eggs, protein-packed", "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=300&fit=crop", "Dairy"),
        ("Onion (1kg)", 35, "Fresh red onions, kitchen staple", "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&h=300&fit=crop", "Vegetables"),
        ("Potato (1kg)", 30, "Fresh aloo, versatile and nutritious", "https://images.unsplash.com/photo-1518977676601-b53f82ber157?w=400&h=300&fit=crop", "Vegetables"),
        ("Tomato (1kg)", 40, "Ripe red tomatoes for gravy and salad", "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=400&h=300&fit=crop", "Vegetables"),
        ("Maggi Noodles (4 pack)", 56, "2-minute instant masala noodles", "https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=300&fit=crop", "Snacks"),
        ("Biscuits Pack (200g)", 30, "Crunchy glucose biscuits, tea-time snack", "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=400&h=300&fit=crop", "Snacks"),
        ("Curd (400g)", 35, "Thick creamy dahi, probiotic-rich", "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop", "Dairy"),
        ("Soap Bar (3 pack)", 99, "Neem antibacterial bath soap, pack of 3", "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=400&h=300&fit=crop", "Personal Care"),
    ]

    cursor.executemany(
        "INSERT INTO products (name, price, description, image_url, category) VALUES (?, ?, ?, ?, ?)",
        products,
    )

def get_all_products():
    """Fetch all products."""
    conn = get_connection()
    rows = conn.execute("SELECT * FROM products ORDER BY category, name").fetchall()
    conn.close()
    return [dict(row) for row in rows]

def create_order(phone: str, items: list, total: float) -> str:
    """Create a new order and return the generated token."""
    conn = get_connection()
    cursor = conn.cursor()

    # Atomic token increment
    cursor.execute(
        "UPDATE counters SET value = value + 1 WHERE name = 'order_token'"
    )
    cursor.execute("SELECT value FROM counters WHERE name = 'order_token'")
    token_num = cursor.fetchone()[0]
    token = f"STORE-{token_num}"

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    items_json = json.dumps(items)

    cursor.execute(
        "INSERT INTO orders (token, phone, items_json, status, total, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
        (token, phone, items_json, "Processing", total, timestamp),
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

def update_order_status(token: str, status: str) -> bool:
    """Toggle order status. Returns True if updated."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE orders SET status = ? WHERE token = ?", (status, token))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated
