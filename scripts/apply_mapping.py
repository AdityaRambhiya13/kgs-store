import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
REPORT_PATH = 'scripts/mapping_report.json'

def main():
    if not os.path.exists(REPORT_PATH):
        print(f"Error: {REPORT_PATH} not found. Run generate_mapping.py first.")
        return

    with open(REPORT_PATH, 'r') as f:
        data = json.load(f)
    
    matches = data.get("perfect_matches", [])
    if not matches:
        print("No perfect matches found to apply.")
        return

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print(f"Applying {len(matches)} perfect matches to the database...")
    
    updated = 0
    for match in matches:
        p_id = match['product_id']
        img_file = match['image_file']
        img_url = f"/api/static/product_images/{img_file}"
        
        cur.execute("UPDATE products SET image_url = %s WHERE id = %s", (img_url, p_id))
        updated += 1
        if updated % 50 == 0:
            print(f"  Processed {updated}...")

    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\n✅ Success! {updated} products updated with optimized images.")
    print("Restart your backend server to see the changes.")

if __name__ == "__main__":
    main()
