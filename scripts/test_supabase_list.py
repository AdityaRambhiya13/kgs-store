
import requests
import os
from dotenv import load_dotenv

load_dotenv('app/.env')

DB_URL = os.getenv('DATABASE_URL', '')
if 'postgres.' in DB_URL:
    PROJECT_ID = DB_URL.split('postgres.')[1].split(':')[0]
else:
    PROJECT_ID = DB_URL.split('@')[1].split('.')[0] if '@' in DB_URL else ''

URL = f"https://{PROJECT_ID}.supabase.co/storage/v1/object/list/products"
KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

print(f"Testing Supabase Storage List...")
print(f"URL: {URL}")
print(f"Key Found: {'Yes' if KEY else 'No'}")

headers = {"Authorization": f"Bearer {KEY}"}
payload = {"prefix": "", "limit": 10}

try:
    res = requests.post(URL, headers=headers, json=payload)
    print(f"Status Code: {res.status_code}")
    print(f"Response: {res.text}")
except Exception as e:
    print(f"Error: {e}")
