
import os
import requests
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
import re

# Load environment variables
load_dotenv('app/.env')

DATABASE_URL = os.getenv('DATABASE_URL', '')
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

if 'postgres.' in DATABASE_URL:
    PROJECT_ID = DATABASE_URL.split('postgres.')[1].split(':')[0]
else:
    PROJECT_ID = DATABASE_URL.split('@')[1].split('.')[0] if '@' in DATABASE_URL else ''

SUPABASE_URL = os.getenv('SUPABASE_URL', f'https://{PROJECT_ID}.supabase.co')
BUCKET_NAME = 'products'
PUBLIC_BASE_URL = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}"

def normalize(text):
    """Normalize text for matching (lowercase, remove special chars)."""
    return re.sub(r'[^a-z0-9]', '', text.lower())

def sync_images(dry_run=True):
    if not SUPABASE_SERVICE_ROLE_KEY:
        print("❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in app/.env")
        return

    print(f"--- Supabase Image Sync ({'DRY RUN' if dry_run else 'LIVE UPDATE'}) ---")
    
    # 1. List files in Supabase
    print(f"Listing files in bucket '{BUCKET_NAME}'...")
    list_url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    headers = {"Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}"}
    
    # We might need to handle pagination if there are > 1000 images
    payload = {"prefix": "", "limit": 1000}
    res = requests.post(list_url, headers=headers, json=payload)
    
    if res.status_code != 200:
        print(f"❌ Failed to list files: {res.status_code} {res.text}")
        return

    storage_files = res.json()
    print(f"Found {len(storage_files)} files in storage.")

    # 2. Fetch products from DB
    print("Fetching products from database...")
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    cur = conn.cursor()
    cur.execute("SELECT id, name, image_url FROM products")
    products = cur.fetchall()
    print(f"Processing {len(products)} products...")

    updates = []
    
    # Create a map of normalized filenames to actual filenames
    file_map = {}
    for f in storage_files:
        name = f['name']
        base_name = os.path.splitext(name)[0]
        file_map[normalize(base_name)] = name

    matched_count = 0
    for p in products:
        p_name = p['name']
        norm_name = normalize(p_name)
        
        # Try direct match
        match = None
        if norm_name in file_map:
            match = file_map[norm_name]
        else:
            # Try partial match (e.g. "maggi" in "Maggi 2-Min Noodles")
            # Only try partial if filename is descriptive (>3 chars)
            for norm_file, real_file in file_map.items():
                if len(norm_file) < 3: continue 
                if norm_file in norm_name:
                    match = real_file
                    break
        
        if match:
            new_url = f"{PUBLIC_BASE_URL}/{match}"
            # Only update if the URL is different or if it's currently a placeholder
            if p['image_url'] != new_url:
                updates.append((new_url, p['id'], p_name, match))
                matched_count += 1

    print(f"\nFound {matched_count} potential updates.")

    if not updates:
        print("No updates needed.")
        return

    if dry_run:
        print("\n--- Dry Run Results (First 10) ---")
        for new_url, p_id, p_name, match in updates[:10]:
            print(f"ID {p_id}: {p_name} -> {match}")
        print(f"... and {len(updates) - 10} more.")
        print("\nTo apply these changes, run with --apply")
    else:
        print("\nApplying updates...")
        for new_url, p_id, p_name, match in updates:
            cur.execute("UPDATE products SET image_url = %s WHERE id = %s", (new_url, p_id))
        
        conn.commit()
        print(f"Successfully updated {len(updates)} products.")

    cur.close()
    conn.close()

if __name__ == "__main__":
    import sys
    apply_changes = "--apply" in sys.argv
    sync_images(dry_run=not apply_changes)
