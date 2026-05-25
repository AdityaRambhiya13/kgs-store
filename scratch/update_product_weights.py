import os
import sys
import re
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Load env variables from app directory
sys.path.append(os.path.join(os.getcwd(), 'app'))
load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)

def extract_and_normalize_unit(name):
    # Pattern for numbers followed by unit
    pattern = r'(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|ltrs|litre|litres|pc|pcs|piece|pieces)\b'
    match = re.search(pattern, name, re.IGNORECASE)
    if match:
        qty = match.group(1)
        utype = match.group(2).lower()
        
        # Normalise unit labels
        if utype in ('kg', 'kgs'):
            return f'{qty}kg'
        elif utype in ('g', 'gm', 'gms', 'gram', 'grams'):
            return f'{qty}g'
        elif utype in ('l', 'ltr', 'ltrs', 'litre', 'litres'):
            return f'{qty}L'
        elif utype == 'ml':
            return f'{qty}ml'
        else: # pc / pcs / piece / pieces
            return f'{qty} pcs' if qty != '1' else 'pc'
    return None

def migrate_product_weights():
    print("Connecting to database...")
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Fetch all products
        cursor.execute("SELECT id, name, price, category, sub_category, unit, description FROM products")
        products = cursor.fetchall()
        print(f"Found {len(products)} products in the database.")
        
        updated_count = 0
        
        for p in products:
            pid = p['id']
            name = p['name']
            price = p['price']
            sub_category = p['sub_category']
            current_unit = p['unit']
            
            # Extract weight/unit from product name
            new_unit = extract_and_normalize_unit(name)
            
            if new_unit and new_unit != current_unit:
                # Calculate new description
                desc = f"Rs.{int(price)}/{new_unit} - {sub_category}" if sub_category else f"Rs.{int(price)}/{new_unit}"
                # In DB we want the rupee symbol, let's create the db_desc using the rupee symbol
                db_desc = f"\u20b9{int(price)}/{new_unit} \u2014 {sub_category}" if sub_category else f"\u20b9{int(price)}/{new_unit}"
                
                # Update product in database
                cursor.execute(
                    "UPDATE products SET unit = %s, description = %s WHERE id = %s",
                    (new_unit, db_desc, pid)
                )
                updated_count += 1
                
                # Show first few updates as sample (safe printing using Rs.)
                if updated_count <= 20:
                    safe_name = name.encode('ascii', 'ignore').decode('ascii')
                    print(f"Updated [ID: {pid}] '{safe_name}': Unit '{current_unit}' -> '{new_unit}' | Desc: '{desc}'")
                elif updated_count == 21:
                    print("...")
        
        conn.commit()
        print(f"\nMigration complete! Successfully updated unit/weight for {updated_count} products.")
        
    except Exception as e:
        conn.rollback()
        print(f"Error migrating weights: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate_product_weights()
