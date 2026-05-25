import os
import time
from dotenv import load_dotenv
load_dotenv('app/.env')
import psycopg2

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
conn.autocommit = True
try:
    cur = conn.cursor()
    
    # Measure time before index
    t0 = time.time()
    cur.execute("SELECT * FROM products ORDER BY CASE WHEN display_order > 0 THEN 0 ELSE 1 END, display_order ASC, category, base_name, price")
    rows = cur.fetchall()
    t_before = time.time() - t0
    print(f"Query time before index: {t_before:.3f}s")
    
    # Create the composite index
    print("Creating composite expression-based index...")
    t_idx_start = time.time()
    cur.execute("""
        CREATE INDEX IF NOT EXISTS idx_products_sorting ON products (
            (CASE WHEN display_order > 0 THEN 0 ELSE 1 END),
            display_order,
            category,
            base_name,
            price
        )
    """)
    print(f"Index created in {time.time() - t_idx_start:.3f}s")
    
    # Measure time after index
    # We run it multiple times to warm up and verify
    times = []
    for i in range(5):
        t0 = time.time()
        cur.execute("SELECT * FROM products ORDER BY CASE WHEN display_order > 0 THEN 0 ELSE 1 END, display_order ASC, category, base_name, price")
        rows = cur.fetchall()
        times.append(time.time() - t0)
    
    print(f"Query times after index: {[f'{t:.3f}s' for t in times]}")
    print(f"Average query time after index: {sum(times)/len(times):.3f}s")
    
finally:
    conn.close()
