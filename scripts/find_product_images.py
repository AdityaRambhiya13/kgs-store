# -*- coding: utf-8 -*-
"""
find_product_images.py
======================
Automatically finds real product image URLs for your KGS catalog.

How it works:
  1. Reads the entire catalog from ULTIMATE_ZEPTO_CATALOG.csv
  2. For each product, tries to find an image from:
       a) Open Food Facts API  - real grocery product photos (free, no API key)
       b) Curated Unsplash IDs - high-quality, RELIABLE category photos (no 404s)
  3. Saves results to: scripts/image_results.json

Run: python scripts/find_product_images.py
"""

import csv
import json
import time
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── Config ────────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_PATH = os.path.join(ROOT_DIR, "ULTIMATE_ZEPTO_CATALOG.csv")
OUT_PATH = os.path.join(ROOT_DIR, "scripts", "image_results.json")
LIMIT    = 9999  # Process everything
DELAY    = 0.3   # Seconds between requests (polite)

# Setup sessions with retries for robustness
session = requests.Session()
retries = Retry(total=3, backoff_factor=1, status_forcelist=[403, 429, 500, 502, 503, 504])
session.mount('https://', HTTPAdapter(max_retries=retries))

# ── Curated Unsplash Photo IDs per category ───────────────
CATEGORY_UNSPLASH = {
    "Atta, Rice & Dal": [
        "photo-1586201375761-83865001e31c",  # white rice grains
        "photo-1574323347407-f5e1ad6d020b",  # wheat field
    ],
    "Masala & Dry Fruits": [
        "photo-1596040033229-a9821ebd058d",  # Indian spices bowl
        "photo-1614373532201-34b87c5ed2b0",  # dry fruits assortment
    ],
    "Snacks & Munchies": [
        "photo-1599490659213-e2b9527bd087",  # snacks
        "photo-1566478989037-eec170784d0b",  # namkeen in bowl
    ],
    "Sweet Tooth": [
        "photo-1589119908995-c6837fa14848",  # sweets
        "photo-1563805042-7684c019e1cb",     # dessert
    ],
    "Cleaning Essentials": [
        "photo-1584622650111-993a426fbf0a",  # cleaning products
        "photo-1585421514738-01798e348b17",  # spray bottle
    ],
    "Instant & Frozen Food": [
        "photo-1621996346565-e3dbc646d9a9",  # instant noodles
        "photo-1612929633738-8fe44f7ec841",  # packaged meal
    ],
    "Dairy, Bread & Eggs": [
        "photo-1550583724-b2692b85b150",     # dairy products
        "photo-1603048719539-9ecb4aa395e4",  # eggs and bread
    ],
    "Personal Care": [
        "photo-1556228578-8c89e6adf883",  # personal care products
        "photo-1616394584738-fc6e612e71b9",  # soap/shampoo
    ],
    "Cold Drinks & Juices": [
        "photo-1534353473418-4cfa0a62e3d8",  # cold drinks
        "photo-1600271886742-f049cd451bba",  # fruit juice
    ],
    "Pharma & Wellness": [
        "photo-1584308666744-24d5c474f2ae",  # medicine
        "photo-1576091160550-2173dba999ef",  # wellness supplements
    ],
    "Tea, Coffee & Health Drinks": [
        "photo-1544787219-7f47ccb76574",  # tea
        "photo-1498804103079-a6351b050096",  # coffee
    ],
    "Paan Corner": [
        "photo-1596547609652-9fc5d8d428ce",  # paan
    ],
    "Pantry Staples": [
        "photo-1615485925763-86db9d2d22f0",  # pantry
        "photo-1546548970-71785318a17b",     # cooking ingredients
    ],
    "Baby Care": [
        "photo-1515488042361-ee00e0ddd4e4",  # baby care
    ],
    "Home & Lifestyle": [
        "photo-1565183928294-7063f23ce0f8",  # home decor
    ],
    "Pooja Needs": [
        "photo-1596040033229-a9821ebd058d",  # use spices image as safe fallback
        "photo-1544787219-7f47ccb76574",     # tea/warm tones - safe fallback
    ],
}

DEFAULT_UNSPLASH_ID = "photo-1584622650111-993a426fbf0a"
_category_index = {}

def get_category_image(category: str) -> str:
    """Return a curated, rotating Unsplash URL for the category. Always works."""
    photos = CATEGORY_UNSPLASH.get(category, [DEFAULT_UNSPLASH_ID])
    idx = _category_index.get(category, 0)
    photo_id = photos[idx % len(photos)]
    _category_index[category] = idx + 1
    return f"https://images.unsplash.com/{photo_id}?w=400&h=300&fit=crop&auto=format&q=80"


def load_existing_results():
    """Load existing results from JSON to support resuming."""
    if os.path.exists(OUT_PATH):
        try:
            with open(OUT_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return {item["name"]: item for item in data}
        except Exception:
            print("[WARN] Could not load existing results. Starting fresh.")
    return {}


def search_open_food_facts(product_name: str) -> str | None:
    """Search Open Food Facts for a real grocery product image."""
    try:
        params = {
            "search_terms": product_name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 3,
            "fields": "image_front_url,image_url",
            "lc": "en",
            "cc": "in",
        }
        resp = session.get(
            "https://world.openfoodfacts.org/cgi/search.pl",
            params=params,
            timeout=10,
            headers={"User-Agent": "KGS-Store-BulkFinder/1.1 (bulk@kgsstore.in)"}
        )
        if resp.status_code == 200:
            data = resp.json()
            for product in data.get("products", []):
                img = product.get("image_front_url") or product.get("image_url")
                if img and img.startswith("https://") and ".jpg" in img:
                    return img
    except Exception:
        pass
    return None


def find_image(product_name: str, category: str) -> dict:
    """Strategy: 1. OFF Real Photo, 2. Curated Fallback"""
    off_img = search_open_food_facts(product_name)
    if off_img:
        return {"url": off_img, "source": "open_food_facts", "quality": "REAL_PRODUCT"}

    time.sleep(DELAY)
    fallback = get_category_image(category)
    return {"url": fallback, "source": "unsplash_curated", "quality": "CATEGORY_PHOTO"}


def main():
    print("=" * 60)
    print(f"[BULK RUN] Starting image discovery for up to {LIMIT} products")
    print("=" * 60)

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at: {CSV_PATH}")
        return

    # Load progress to support RESUME
    existing_results_map = load_existing_results()
    if existing_results_map:
        print(f"[RESUME] Found {len(existing_results_map)} existing results. Will skip these.")

    with open(CSV_PATH, mode='r', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))[:LIMIT]

    total = len(rows)
    print(f"[INFO] Processing {total} products...\n")

    results = list(existing_results_map.values())
    stats = {"open_food_facts": 0, "unsplash_curated": 0}

    try:
        for i, row in enumerate(rows, 1):
            name     = (row.get("name") or "").strip()
            category = (row.get("Category") or "Pantry Staples").strip()
            
            if not name: continue

            # RESUME LOGIC: Skip if already found
            if name in existing_results_map:
                continue

            # Progress every 10 items or at specific milestones
            if i % 10 == 0 or i == 1:
                prog = (i / total) * 100
                print(f"[{i:04d}/{total}] ({prog:.1f}%) Processing: {name[:40]}...")

            result = find_image(name, category)
            stats[result["source"]] += 1

            results.append({
                "index":        i,
                "name":         name,
                "category":     category,
                "image_url":    result["url"],
                "source":       result["source"],
                "quality":      result["quality"],
            })

            # Intermediate save every 50 items to prevent data loss
            if i % 50 == 0:
                with open(OUT_PATH, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)

    except KeyboardInterrupt:
        print("\n[STOP] Process interrupted by user. Saving partial results...")

    # Final Save
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print("\n" + "=" * 60)
    print("BULK RESULTS SUMMARY")
    print("=" * 60)
    print(f"  [REAL PRODUCT]  Open Food Facts real photos (newly found): {stats['open_food_facts']}")
    print(f"  [CATEGORY IMG]  Curated Unsplash fallbacks (newly found):  {stats['unsplash_curated']}")
    print(f"  Total in JSON:  {len(results)}")
    print(f"  Results saved to: {OUT_PATH}")
    print("\nNEXT STEP: Run 'python scripts/apply_product_images.py' to update database.")

if __name__ == "__main__":
    main()
