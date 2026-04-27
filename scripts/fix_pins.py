import os
import sys
import hashlib
from dotenv import load_dotenv
import psycopg2
from psycopg2 import extras

# Add app directory to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode()).hexdigest()

def fix_missing_pins():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in app/.env")
        return
    
    conn = psycopg2.connect(DATABASE_URL)
    try:
        cursor = conn.cursor()
        
        # Check how many users have no PIN
        cursor.execute("SELECT COUNT(*) FROM customers WHERE pin_hash IS NULL OR pin_hash = ''")
        count = cursor.fetchone()[0]
        
        if count == 0:
            print("All customers already have a PIN hash.")
            return
            
        print(f"Found {count} customers with missing PIN hash. Setting default PIN '1234'...")
        
        default_pin_hash = hash_pin("1234")
        cursor.execute(
            "UPDATE customers SET pin_hash = %s WHERE pin_hash IS NULL OR pin_hash = ''",
            (default_pin_hash,)
        )
        
        conn.commit()
        print(f"Successfully updated {cursor.rowcount} customers.")
        
    finally:
        conn.close()

if __name__ == "__main__":
    fix_missing_pins()
