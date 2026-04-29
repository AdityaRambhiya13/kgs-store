import os
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Load from app/.env
load_dotenv("app/.env")

DATABASE_URL = os.getenv("DATABASE_URL")

def check_mrp():
    print(f"Connecting to {DATABASE_URL[:20]}...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM information_schema.columns WHERE table_name='products' AND column_name='mrp'")
        row = cursor.fetchone()
        if row:
            print("MRP column exists!")
            cursor.execute("SELECT id, name, price, mrp FROM products LIMIT 5")
            rows = cursor.fetchall()
            for r in rows:
                print(r)
        else:
            print("MRP column MISSING!")
    finally:
        conn.close()

if __name__ == "__main__":
    check_mrp()
