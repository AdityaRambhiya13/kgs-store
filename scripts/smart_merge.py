import os
import sys
import re
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv
from collections import defaultdict

# Add app directory to path
sys.path.append(os.path.join(os.getcwd(), 'app'))
load_dotenv('app/.env')

DATABASE_URL = os.getenv("DATABASE_URL")

def get_connection():
    return psycopg2.connect(DATABASE_URL, cursor_factory=extras.RealDictCursor)

def extract_weight(name):
    """Extract weight/size from name like 'Product 500Gm' or 'Oil 1L'."""
    # Pattern for 100g, 100 g, 100gm, 1kg, 1 kg, 500ml, 1l, etc.
    pattern = r'(\d+\.?\d*)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|ltrs|pc|pcs|piece|pieces)\b'
    match = re.search(pattern, name, re.IGNORECASE)
    if match:
        amount = match.group(1)
        unit = match.group(2).lower()
        # Standardize units
        if unit in ['g', 'gm', 'gms', 'gram', 'grams']: unit = 'g'
        if unit in ['kg', 'kgs']: unit = 'kg'
        if unit in ['ml']: unit = 'ml'
        if unit in ['l', 'ltr', 'ltrs']: unit = 'l'
        if unit in ['pc', 'pcs', 'piece', 'pieces']: unit = 'pcs'
        return f"{amount}{unit}"
    return "no_size"

def normalize_base_name(name):
    """Remove weight, special chars, and common typos to find the 'core' name."""
    # Remove weight
    weight_pattern = r'(\d+\.?\d*)\s*(kg|kgs|g|gm|gms|gram|grams|ml|l|ltr|ltrs|pc|pcs|piece|pieces)\b'
    name = re.sub(weight_pattern, '', name, flags=re.IGNORECASE)
    
    # Clean up
    name = name.lower()
    name = re.sub(r'[^a-z0-9\s]', ' ', name) # Remove special chars
    name = re.sub(r'\s+', ' ', name).strip()
    
    # Common replacements for typos/variations
    name = name.replace('biscuits', 'biscuit')
    name = name.replace('khakhra', 'khakra')
    name = name.replace('wade', 'vada')
    name = name.replace('chane', 'chana')
    name = name.replace('poha', 'pohe') # Or vice versa, pick one
    name = name.replace('shev', 'sev')
    
    return name

def analyze_merges():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, category, sub_category FROM products")
        products = cursor.fetchall()
        
        # Group by (normalized_name, category, weight)
        groups = defaultdict(list)
        for p in products:
            base = normalize_base_name(p['name'])
            weight = extract_weight(p['name'])
            key = (base, p['category'], weight)
            groups[key].append(p)
            
        merge_plan = []
        for key, members in groups.items():
            if len(members) > 1:
                # Members are duplicates to be merged
                # Pick the one with the 'best' name (longest usually contains best info)
                members.sort(key=lambda x: len(x['name']), reverse=True)
                master = members[0]
                duplicates = members[1:]
                merge_plan.append({
                    "master": master,
                    "duplicates": duplicates,
                    "key": key
                })
        
        return merge_plan
    finally:
        conn.close()

def execute_merges(plan):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        total_removed = 0
        
        for entry in plan:
            master_id = entry['master']['id']
            duplicate_ids = [d['id'] for d in entry['duplicates']]
            
            # 1. Update customer favorites
            cursor.execute(
                "UPDATE customer_favorites SET product_id = %s WHERE product_id IN %s",
                (master_id, tuple(duplicate_ids))
            )
            
            # 2. Delete duplicates
            cursor.execute(
                "DELETE FROM products WHERE id IN %s",
                (tuple(duplicate_ids),)
            )
            total_removed += cursor.rowcount
            
        conn.commit()
        print(f"Successfully merged {len(plan)} groups. Total products removed: {total_removed}")
    except Exception as e:
        conn.rollback()
        print(f"Error during merge: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    plan = analyze_merges()
    print(f"Found {len(plan)} groups of duplicates to merge.")
    
    # Print some examples
    print("\n--- SAMPLE MERGE PLAN ---")
    for entry in plan[:10]:
        print(f"Master: {entry['master']['name']} (ID: {entry['master']['id']})")
        for d in entry['duplicates']:
            print(f"  - Duplicate: {d['name']} (ID: {d['id']})")
        print("-" * 30)
    
    if len(sys.argv) > 1 and sys.argv[1] == "--run":
        execute_merges(plan)
    else:
        print("\nRun with '--run' to execute these merges.")
