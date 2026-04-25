import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    products_to_check = ["Rice Atta 1Kg", "Red Chawali 250Gm", "Sabudana 500Gm"]
    
    print("Checking database for product image URLs...")
    for name in products_to_check:
        cur.execute("SELECT name, image_url FROM products WHERE name = %s", (name,))
        row = cur.fetchone()
        if row:
            print(f"  - {row[0]}: {row[1]}")
        else:
            print(f"  - {name}: NOT FOUND IN DB")
            
    # Check total count of products with local images
    cur.execute("SELECT count(*) FROM products WHERE image_url LIKE '/api/static/product_images/%'")
    count = cur.fetchone()[0]
    print(f"\nTotal products with assigned local images: {count}")
    
    conn.close()

if __name__ == "__main__":
    main()
