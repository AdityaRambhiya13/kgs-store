import os
import psycopg2
from dotenv import load_dotenv

load_dotenv("app/.env")

def migrate_categories():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()
    
    # 1. Map to Miscellaneous
    to_misc = ["Baby Care", "Pantry Staples", "Paan Corner", "Pantry Samples"]
    for cat in to_misc:
        cur.execute("UPDATE products SET category = %s WHERE category = %s", ("Miscellaneous", cat))
        print(f"Moved {cur.rowcount} items from '{cat}' to 'Miscellaneous'")
        
    # 2. Rename Pharma & Wellness
    cur.execute("UPDATE products SET category = %s WHERE category = %s OR category = %s", ("& Wellness", "Pharma", "Pharma & Wellness"))
    print(f"Renamed {cur.rowcount} items to '& Wellness'")
    
    # 3. Clean up encoded duplicates
    mappings = {
        "Atta, Rice &amp; Dal": "Atta, Rice & Dal",
        "Instant &amp; Frozen Food": "Instant & Frozen Food",
        "Tea, Coffee &amp; Health Drinks": "Tea, Coffee & Health Drinks",
        "Cold Drinks &amp; Juices": "Cold Drinks & Juices",
        "Masala &amp; Dry Fruits": "Masala & Dry Fruits",
        "Dairy, Bread &amp; Eggs": "Dairy, Bread & Eggs"
    }
    for old, new in mappings.items():
        cur.execute("UPDATE products SET category = %s WHERE category = %s", (new, old))
        if cur.rowcount > 0:
            print(f"Cleaned up {cur.rowcount} items from '{old}' to '{new}'")

    conn.commit()
    print("Migration complete!")
    cur.close()
    conn.close()

if __name__ == "__main__":
    migrate_categories()
