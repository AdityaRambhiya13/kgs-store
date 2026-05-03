
import os
import requests
from dotenv import load_dotenv

load_dotenv('app/.env')

url = 'https://iezqlltomqrdkgogdgqu.supabase.co/storage/v1/bucket'
headers = {'Authorization': f'Bearer {os.getenv("SUPABASE_SERVICE_ROLE_KEY")}'}

res = requests.get(url, headers=headers)
print(res.json())
