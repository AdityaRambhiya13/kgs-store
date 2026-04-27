import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import extras

# Add app directory to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def check_customers():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in app/.env")
        return
    
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT phone, name, email, pin_hash FROM customers")
        customers = cursor.fetchall()
        
        print(f"Total customers: {len(customers)}")
        print("\nStored phone numbers details:")
        for c in customers:
            p = c['phone']
            print(f"- Phone: '{p}' (Length: {len(p)})")
            print(f"  Name: {c['name']}")
            print(f"  Has PIN? {bool(c.get('pin_hash'))}")
            print(f"  Digits only? {p.isdigit()}")
            if not p.isdigit():
                print(f"  Characters: {[ord(char) for char in p]}")
            
    finally:
        conn.close()

if __name__ == "__main__":
    check_customers()
