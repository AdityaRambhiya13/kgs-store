
import psycopg2
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv('app/.env')

DATABASE_URL = os.getenv('DATABASE_URL', '')
# Extract project ID from username (e.g., postgres.iezqlltomqrdkgogdgqu)
if 'postgres.' in DATABASE_URL:
    PROJECT_ID = DATABASE_URL.split('postgres.')[1].split(':')[0]
else:
    PROJECT_ID = DATABASE_URL.split('@')[1].split('.')[0] if '@' in DATABASE_URL else ''

SUPABASE_URL = os.getenv('SUPABASE_URL', f'https://{PROJECT_ID}.supabase.co')
BUCKET_NAME = 'products'

# Base URL for public objects in Supabase
PUBLIC_BASE_URL = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}"

REPORT_PATH = 'scripts/mapping_report.json'

def main():
    if not os.path.exists(REPORT_PATH):
        print(f"❌ Error: {REPORT_PATH} not found. Run generate_mapping.py first.")
        return

    with open(REPORT_PATH, 'r') as f:
        data = json.load(f)
    
    matches = data.get("perfect_matches", [])
    if not matches:
        print("No perfect matches found to apply.")
        return

    print(f"Connecting to Supabase Database...")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    print(f"Updating {len(matches)} products with Supabase Storage links...")
    
    updated = 0
    for match in matches:
        p_id = match['product_id']
        img_file = match['image_file']
        
        # New Supabase Public URL
        img_url = f"{PUBLIC_BASE_URL}/{img_file}"
        
        cur.execute("UPDATE products SET image_url = %s WHERE id = %s", (img_url, p_id))
        updated += 1
        if updated % 50 == 0:
            print(f"  Processed {updated}...")

    conn.commit()
    cur.close()
    conn.close()
    
    print(f"\nSuccess! {updated} products updated with professional Supabase links.")
    print(f"Sample URL: {img_url}")
    print("\nNext: Your website will now load images directly from Supabase!")

if __name__ == "__main__":
    main()
