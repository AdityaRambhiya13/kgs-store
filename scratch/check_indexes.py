import os
from dotenv import load_dotenv
load_dotenv('app/.env')
import psycopg2

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
try:
    cur = conn.cursor()
    cur.execute("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'products'")
    rows = cur.fetchall()
    print("EXISTING INDEXES ON PRODUCTS:")
    for row in rows:
        print(f"- {row[0]}: {row[1]}")
finally:
    conn.close()
