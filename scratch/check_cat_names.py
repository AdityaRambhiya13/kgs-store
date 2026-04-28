import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'app', '.env'))
from database import get_connection, release_connection

conn = get_connection()
cur = conn.cursor()
cur.execute("SELECT DISTINCT category FROM products")
rows = cur.fetchall()
for row in rows:
    cat = row['category']
    print(f"'{cat}' - length: {len(cat)}")
release_connection(conn)
