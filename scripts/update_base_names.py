import os
import sys
import re
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

# Add app directory to path
sys.path.append(os.path.join(os.getcwd(), 'app'))
load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)

def extract_base_name(name):
    """Clean the name to get a consistent base name without weight/size."""
    # Pattern for weight/size
    weight_pattern = r'(\d+\.?\d*)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|ltrs|pc|pcs|piece|pieces|unit|units|mt|lt)\b'
    
    # Remove weight/size
    base = re.sub(weight_pattern, '', name, flags=re.IGNORECASE)
    
    # Clean up punctuation and extra spaces
    base = re.sub(r'[^a-zA-Z0-9\s\&]', ' ', base)
    base = re.sub(r'\s+', ' ', base).strip()
    
    # Title Case for beauty
    return base.title()

def update_all_base_names():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        print("Fetching all products...")
        cursor.execute("SELECT id, name FROM products")
        products = cursor.fetchall()
        
        print(f"Analyzing {len(products)} products...")
        updates = []
        for p in products:
            new_base = extract_base_name(p['name'])
            updates.append((new_base, p['id']))
            
        print("Executing updates...")
        extras.execute_batch(
            cursor,
            "UPDATE products SET base_name = %s WHERE id = %s",
            updates
        )
        
        conn.commit()
        print(f"Successfully updated base_name for {len(updates)} products.")
        print("The frontend will now automatically group these as options!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    update_all_base_names()
