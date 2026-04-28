import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'app', '.env'))
from database import get_connection, release_connection

conn = get_connection()
cur = conn.cursor()
cur.execute("SELECT DISTINCT category FROM products ORDER BY category")
for row in cur.fetchall():
    print(row['category'])
release_connection(conn)
