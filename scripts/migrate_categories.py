import os
import html
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv("app/.env")

# Standard Categories Configuration from CatalogPage.jsx
VALID_CATEGORIES = [
    'Atta, Rice & Dal',
    'Masala & Dry Fruits',
    'Snacks & Munchies',
    'Sweet Tooth',
    'Cleaning Essentials',
    'Instant & Frozen Food',
    'Dairy & Bread',
    'Personal Care',
    'Cold Drinks & Juices',
    'Wellness',
    'Tea, Coffee & Health Drinks',
    'Home & Lifestyle',
    'Pooja Needs',
    'Miscellaneous'
]

# Case-insensitive mapping for custom/near-miss categories
CATEGORY_MAPPINGS = {
    "dals & pulses": "Atta, Rice & Dal",
    "daals & pulses": "Atta, Rice & Dal",
    "rice & poha": "Atta, Rice & Dal",
    "rice": "Atta, Rice & Dal",
    "wheat": "Atta, Rice & Dal",
    "jowari": "Atta, Rice & Dal",
    "bajri": "Atta, Rice & Dal",
    "sooji, rava & maida": "Atta, Rice & Dal",
    "sooji rava maida": "Atta, Rice & Dal",
    "rawa & sooji": "Atta, Rice & Dal",
    "cooking oil": "Atta, Rice & Dal",
    "sugar": "Atta, Rice & Dal",
    "salt, sugar & jaggery": "Atta, Rice & Dal",
    "sugar, salt & jaggery": "Atta, Rice & Dal",
    "dry fruits": "Masala & Dry Fruits",
    "diet snacks": "Snacks & Munchies",
    "sweets": "Sweet Tooth",
    "chocolate": "Sweet Tooth",
    "ladu": "Sweet Tooth",
    "shampoo & conditioner": "Personal Care",
    "food": "Miscellaneous",
    "rice atta daal": "Atta, Rice & Dal",
    "rice atta dal": "Atta, Rice & Dal",
    "atta rice dal": "Atta, Rice & Dal",
}

def clean_html_entities(text: str) -> str:
    if not text:
        return ""
    prev = ""
    curr = str(text)
    while curr != prev:
        prev = curr
        curr = html.unescape(prev)
    return curr.strip()

def migrate_categories():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found!")
        return

    print("Connecting to database...")
    conn = psycopg2.connect(db_url, cursor_factory=RealDictCursor)
    cur = conn.cursor()
    
    try:
        # 1. Fetch all products
        cur.execute("SELECT id, name, category, sub_category FROM products")
        products = cur.fetchall()
        print(f"Found {len(products)} products to check.")
        
        updates = []
        cleaned_count = 0
        merged_count = 0
        
        for p in products:
            prod_id = p['id']
            old_cat = p['category'] or ''
            old_sub = p['sub_category'] or ''
            
            # Recursive HTML clean
            clean_cat = clean_html_entities(old_cat)
            clean_sub = clean_html_entities(old_sub)
            
            # Map near-miss categories case-insensitively
            mapped_cat = clean_cat
            cat_lower = clean_cat.lower()
            if cat_lower in CATEGORY_MAPPINGS:
                mapped_cat = CATEGORY_MAPPINGS[cat_lower]
            
            # Check if any change occurred
            if old_cat != mapped_cat or old_sub != clean_sub:
                updates.append((mapped_cat, clean_sub, prod_id))
                if clean_html_entities(old_cat) != mapped_cat:
                    merged_count += 1
                if old_cat != clean_html_entities(old_cat) or old_sub != clean_sub:
                    cleaned_count += 1
                    
        # 2. Apply updates in batch
        if updates:
            print(f"Applying updates to {len(updates)} products...")
            cur.executemany(
                "UPDATE products SET category = %s, sub_category = %s WHERE id = %s",
                updates
            )
            conn.commit()
            print(f"Successfully cleaned HTML entities on {cleaned_count} items.")
            print(f"Successfully auto-merged near-miss/custom categories on {merged_count} items.")
        else:
            print("All products are already clean and mapped perfectly!")
            
    except Exception as e:
        print(f"Error during migration: {e}")
        conn.rollback()
    finally:
        cur.close()
        conn.close()
        print("Migration process finished.")

if __name__ == "__main__":
    migrate_categories()
