import os
import sys
import json
from dotenv import load_dotenv

# Add app to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

# Load env
load_dotenv(os.path.join(os.getcwd(), 'app', '.env'))

from database import get_connection, release_connection

def check_db():
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Check columns
        cursor.execute("SELECT column_name FROM information_schema.columns WHERE table_name='products'")
        columns = [row['column_name'] for row in cursor.fetchall()]
        print(f"Columns in products table: {columns}")
        
        # Check first row
        cursor.execute("SELECT * FROM products LIMIT 1")
        row = cursor.fetchone()
        if row:
            print(f"First row sample keys: {list(row.keys())}")
            print(f"First row values: {dict(row)}")
        else:
            print("No products found in table.")
            
    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        if conn:
            release_connection(conn)

if __name__ == "__main__":
    check_db()
