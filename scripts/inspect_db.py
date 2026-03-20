import sqlite3
import os

db_path = 'app/store.db'
if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
c = conn.cursor()

c.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = c.fetchall()
print(f"Tables: {tables}")

if ('products',) in tables or any('products' in t[0] for t in tables):
    # Find the exact table name if it's slightly different
    table_name = 'products' if ('products',) in tables else [t[0] for t in tables if 'products' in t[0]][0]
    print(f"Inspecting table: {table_name}")
    
    c.execute(f"PRAGMA table_info({table_name})")
    schema = c.fetchall()
    print("Schema:")
    for col in schema:
        print(f"  {col}")
        
    c.execute(f"SELECT * FROM {table_name} LIMIT 5")
    samples = c.fetchall()
    print("Sample Data:")
    for row in samples:
        print(f"  {row}")
else:
    print("Table 'products' not found in store.db")

conn.close()
