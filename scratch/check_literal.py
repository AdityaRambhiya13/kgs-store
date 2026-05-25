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
cursor.execute("SELECT id, name, base_name, unit, description FROM products WHERE name ILIKE '%Chaat Masala%'")
rows = cursor.fetchall()
for r in rows:
    print(f"ID: {r['id']}")
    print(f"  name: {repr(r['name'])}")
    print(f"  base_name: {repr(r['base_name'])}")
    print(f"  unit: {repr(r['unit'])}")
    print(f"  description: {repr(r['description'])}")
conn.close()
