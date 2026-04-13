import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('app/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

search_terms = ['Himalaya', 'Muesli', 'Soap', 'Kellog']
for term in search_terms:
    print(f"--- Results for: {term} ---")
    cur.execute("SELECT name FROM products WHERE name ILIKE %s;", (f"%{term}%",))
    rows = cur.fetchall()
    for row in rows:
        print(row[0])

conn.close()
