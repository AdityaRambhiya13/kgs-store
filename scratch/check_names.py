import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Check for products with "Chana" in name
    cur.execute("SELECT id, name FROM products WHERE name ILIKE '%Chana%' LIMIT 20")
    products = cur.fetchall()
    print("Products with 'Chana':")
    for p_id, name in products:
        print(f"  {p_id}: {name}")
        
    # Check for products with "Dettol" in name
    cur.execute("SELECT id, name FROM products WHERE name ILIKE '%Dettol%' LIMIT 20")
    products = cur.fetchall()
    print("\nProducts with 'Dettol':")
    for p_id, name in products:
        print(f"  {p_id}: {name}")

    conn.close()

if __name__ == "__main__":
    main()
