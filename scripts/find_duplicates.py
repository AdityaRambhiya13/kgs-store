import os
import sys
from dotenv import load_dotenv
import psycopg2
from psycopg2 import extras
import difflib

# Add app directory to path so we can import database if needed
sys.path.append(os.path.join(os.getcwd(), 'app'))

load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def get_products():
    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in app/.env")
        return []
    
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, sub_category, base_name FROM products")
        return cursor.fetchall()
    finally:
        conn.close()

def find_duplicates():
    products = get_products()
    if not products:
        return
    
    print(f"Analyzing {len(products)} products...")
    
    # 1. Exact duplicates (case-insensitive, stripped)
    name_map = {}
    for p in products:
        name = p['name'].strip().lower()
        if name not in name_map:
            name_map[name] = []
        name_map[name].append(p)
    
    exact_duplicates = {name: prods for name, prods in name_map.items() if len(prods) > 1}
    
    # 2. Fuzzy duplicates using a sorted sliding window
    all_names = sorted(list(name_map.keys()))
    fuzzy_groups = []
    processed_fuzzy = set()
    
    # Window size for comparison - similar names should be close when sorted
    WINDOW_SIZE = 20
    
    for i, name1 in enumerate(all_names):
        if name1 in processed_fuzzy:
            continue
            
        group = [name1]
        
        # Look ahead in the sorted list
        for j in range(i + 1, min(i + WINDOW_SIZE, len(all_names))):
            name2 = all_names[j]
            if name2 in processed_fuzzy:
                continue
                
            ratio = difflib.SequenceMatcher(None, name1, name2).ratio()
            if ratio > 0.85:
                group.append(name2)
                processed_fuzzy.add(name2)
        
        if len(group) > 1:
            fuzzy_groups.append(group)
            processed_fuzzy.add(name1)
            
    # Write report
    report_path = 'duplicate_products_report.txt'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("=== DUPLICATE PRODUCTS REPORT ===\n")
        f.write(f"Total Products Analyzed: {len(products)}\n\n")
        
        f.write("--- EXACT NAME DUPLICATES (Same name, different IDs) ---\n")
        if not exact_duplicates:
            f.write("None found.\n")
        else:
            for name, prods in sorted(exact_duplicates.items()):
                f.write(f"\nName: '{prods[0]['name']}' ({len(prods)} occurrences)\n")
                for p in prods:
                    f.write(f"  - ID: {p['id']}, Category: {p['category']}, Sub: {p['sub_category']}\n")
        
        f.write("\n\n--- FUZZY NAME MATCHES (Similar names, likely same product) ---\n")
        if not fuzzy_groups:
            f.write("None found.\n")
        else:
            for group in fuzzy_groups:
                f.write(f"\nSimilar Group:\n")
                for name in group:
                    prods = name_map[name]
                    for p in prods:
                        f.write(f"  - '{p['name']}' (ID: {p['id']}, Category: {p['category']})\n")
    
    print(f"Report generated: {report_path}")

if __name__ == "__main__":
    find_duplicates()
