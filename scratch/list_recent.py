
import os
import requests
from dotenv import load_dotenv

load_dotenv('app/.env')

url = 'https://iezqlltomqrdkgogdgqu.supabase.co/storage/v1/object/list/products'
headers = {'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}'}

payload = {'prefix': '', 'limit': 50, 'sortBy': {'column': 'created_at', 'order': 'desc'}}
res = requests.post(url, headers=headers, json=payload)
for f in res.json():
    print(f"{f['name']} - {f['created_at']}")
