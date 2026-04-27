
import os
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables
load_dotenv('app/.env')

# Supabase Configuration
DB_URL = os.getenv('DATABASE_URL', '')
# Extract project ID from username (e.g., postgres.iezqlltomqrdkgogdgqu)
if 'postgres.' in DB_URL:
    PROJECT_ID = DB_URL.split('postgres.')[1].split(':')[0]
else:
    PROJECT_ID = DB_URL.split('@')[1].split('.')[0] if '@' in DB_URL else ''
SUPABASE_URL = os.getenv('SUPABASE_URL', f'https://{PROJECT_ID}.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') # Use Service Role Key for uploads
BUCKET_NAME = 'products'

# Local Configuration
IMAGE_DIR = Path('app/static/product_images')

def upload_images():
    if not SUPABASE_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in app/.env")
        print("Please add it to your .env file to continue.")
        return

    if not os.path.exists(IMAGE_DIR):
        print(f"ERROR: Image directory {IMAGE_DIR} not found.")
        return

    print(f"Starting bulk upload to Supabase bucket: {BUCKET_NAME}")
    print(f"URL: {SUPABASE_URL}")

    # Get all images recursively
    files_to_upload = []
    for root, dirs, files in os.walk(IMAGE_DIR):
        for file in files:
            if file.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')):
                files_to_upload.append(Path(root) / file)
    
    print(f"Found {len(files_to_upload)} images to upload.\n")

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "x-upsert": "true" # Overwrite if exists
    }

    success_count = 0
    error_count = 0

    for file_path in files_to_upload:
        # Get path relative to IMAGE_DIR to maintain structure in Supabase
        rel_path = os.path.relpath(file_path, IMAGE_DIR)
        # Convert backslashes to forward slashes for Supabase storage paths
        storage_path = rel_path.replace('\\', '/')
        
        # Supabase Storage API endpoint
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"
        
        try:
            with open(file_path, 'rb') as f:
                response = requests.post(url, headers=headers, data=f)
            
            if response.status_code == 200:
                success_count += 1
                print(f"OK: Uploaded: {storage_path}", flush=True)
            else:
                error_count += 1
                print(f"FAIL: {storage_path} - {response.status_code} {response.text}", flush=True)
        except Exception as e:
            error_count += 1
            print(f"ERROR uploading {storage_path}: {str(e)}", flush=True)

    print("\n" + "="*30)
    print(f"Upload Complete!")
    print(f"Success: {success_count}")
    print(f"Failed: {error_count}")
    print("="*30)
    print(f"\nNext Step: Run 'python scripts/apply_mapping_supabase.py' to update your DB links.")

if __name__ == "__main__":
    upload_images()
