import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

sys.stdout.reconfigure(encoding='utf-8')

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app', '.env')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                k, v = line.strip().split('=', 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

url = os.getenv("DATABASE_URL")
conn = psycopg2.connect(url, cursor_factory=RealDictCursor)
cursor = conn.cursor()
cursor.execute("SELECT id, name, description, unit FROM products")
rows = cursor.fetchall()
found = 0
for r in rows:
    if '4.6' in r['description'] or '51' in r['description'] or 'star' in r['description'].lower() or 'rating' in r['description'].lower():
        print(f"ID: {r['id']}, Name: {r['name']}, Description: {r['description']}")
        found += 1
print(f"Total found: {found}")
conn.close()
