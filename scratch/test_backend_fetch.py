
import os
import requests
from dotenv import load_dotenv

load_dotenv('app/.env')

SUPABASE_URL = "https://iezqlltomqrdkgogdgqu.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "products"

def fetch_all_images():
    all_images = []
    def fetch_recursive(prefix=""):
        offset = 0
        page_size = 1000
        while True:
            url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
            headers = {
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "prefix": prefix,
                "limit": page_size,
                "offset": offset,
                "sortBy": {"column": "name", "order": "asc"}
            }
            res = requests.post(url, headers=headers, json=payload)
            items = res.json()
            if not items: break
            for item in items:
                name = item.get("name")
                if not name: continue
                full_path = f"{prefix}{name}"
                if item.get("id"):
                    if name.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')):
                        all_images.append(full_path)
                else:
                    fetch_recursive(f"{full_path}/")
            if len(items) < page_size: break
            offset += page_size
    
    fetch_recursive("")
    return all_images

imgs = fetch_all_images()
print(f"Total images found: {len(imgs)}")
vaseline = [i for i in imgs if 'vaseline' in i.lower()]
print(f"Vaseline images: {len(vaseline)}")
for v in vaseline:
    print(f" - {v}")
