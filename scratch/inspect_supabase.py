
import os
import requests
from dotenv import load_dotenv

load_dotenv('app/.env')
SUPABASE_URL = "https://iezqlltomqrdkgogdgqu.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
BUCKET_NAME = "products"

def list_files(prefix=""):
    url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"
    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "prefix": prefix,
        "limit": 100,
        "offset": 0
    }
    response = requests.post(url, headers=headers, json=payload)
    return response.json()

print("Root files:")
print(list_files(""))
