
import os
import requests
from dotenv import load_dotenv

load_dotenv('app/.env')

url = 'https://iezqlltomqrdkgogdgqu.supabase.co/storage/v1/object/list/products'
headers = {'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}'}

def list_all(prefix=""):
    payload = {'prefix': prefix, 'limit': 1000}
    res = requests.post(url, headers=headers, json=payload)
    if res.status_code != 200:
        print(f"Error: {res.status_code} {res.text}")
        return
    
    items = res.json()
    for item in items:
        name = item['name']
        full_path = f"{prefix}{name}"
        if item.get('id'):
            if 'vaseline' in full_path.lower():
                print(f"FILE: {full_path}")
        else:
            list_all(f"{full_path}/")

list_all()
