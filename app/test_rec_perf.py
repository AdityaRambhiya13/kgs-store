import os
import time

# Parse .env file manually to avoid external dependency issues
if os.path.exists(".env"):
    with open(".env", "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, val = line.split("=", 1)
                os.environ[key.strip()] = val.strip()

from database import (
    get_trending_products,
    get_similar_products,
    get_frequently_bought_together,
    get_smart_reorder_reminders
)

def run_performance_test():
    print("=== PERFORMANCE TEST: KGS RECOMMENDATION SUITE ===")
    
    # 1. Trending Products
    start = time.perf_counter()
    trending = get_trending_products(limit=6)
    duration_ms = (time.perf_counter() - start) * 1000
    print(f"[*] get_trending_products() (first call): found {len(trending)} items in {duration_ms:.3f}ms")

    # Second call (cache hit)
    start = time.perf_counter()
    trending_cached = get_trending_products(limit=6)
    duration_cached_ms = (time.perf_counter() - start) * 1000
    print(f"[*] get_trending_products() (second call - cache hit): found {len(trending_cached)} items in {duration_cached_ms:.3f}ms")
    
    # Get a sample product ID to test similarity
    sample_id = None
    if trending:
        sample_id = trending[0]['id']
        print(f"[*] Using sample product ID: {sample_id} ('{trending[0]['name']}')")
    
    if sample_id is not None:
        # 2. Similar Products
        start = time.perf_counter()
        similar = get_similar_products(sample_id, limit=6)
        duration_ms = (time.perf_counter() - start) * 1000
        print(f"[*] get_similar_products({sample_id}): found {len(similar)} items in {duration_ms:.3f}ms")
        for p in similar[:2]:
            print(f"    - Similar: {p['name']} (score: {p.get('similarity_score', 0):.3f})")
            
        # 3. Frequently Bought Together (FBT)
        start = time.perf_counter()
        fbt = get_frequently_bought_together([sample_id], limit=4)
        duration_ms = (time.perf_counter() - start) * 1000
        print(f"[*] get_frequently_bought_together([{sample_id}]): found {len(fbt)} items in {duration_ms:.3f}ms")
        for p in fbt[:2]:
            print(f"    - FBT: {p['name']}")

    # 4. Smart Reorder Reminders
    # We will test with a dummy phone number or one that has orders in store.db
    # Let's try listing some customers first to find a real phone number
    import sqlite3
    phone = "+919999999999"
    if os.path.exists("store.db"):
        conn = sqlite3.connect("store.db")
        cursor = conn.cursor()
        try:
            cursor.execute("SELECT DISTINCT phone FROM orders LIMIT 1")
            row = cursor.fetchone()
            if row:
                phone = row[0]
        except Exception:
            pass
        conn.close()
    
    start = time.perf_counter()
    reorders = get_smart_reorder_reminders(phone, limit=6)
    duration_ms = (time.perf_counter() - start) * 1000
    print(f"[*] get_smart_reorder_reminders('{phone}'): found {len(reorders)} items in {duration_ms:.3f}ms")
    for p in reorders[:2]:
        print(f"    - Reorder: {p['name']} (Reason: {p.get('reorder_reason')})")

if __name__ == "__main__":
    run_performance_test()
