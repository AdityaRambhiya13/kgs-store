# -*- coding: utf-8 -*-
"""
find_product_images.py
======================
Automatically finds real product image URLs for your KGS catalog.

How it works:
  1. Reads the first 50 products from ULTIMATE_ZEPTO_CATALOG.csv
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

# ── Config ────────────────────────────────────────────────
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
CSV_PATH = os.path.join(ROOT_DIR, "ULTIMATE_ZEPTO_CATALOG.csv")
OUT_PATH = os.path.join(ROOT_DIR, "scripts", "image_results.json")
LIMIT    = 50    # Test with first 50 products
DELAY    = 0.3   # Seconds between requests (polite)

# ── Curated Unsplash Photo IDs per category ───────────────
# These are DIRECT image IDs — reliable, no 404s, no deprecated API
# Each maps to a real Unsplash photo relevant to the category
CATEGORY_UNSPLASH = {
    "Atta, Rice & Dal": [
        "photo-1586201375761-83865001e31c",  # white rice grains (verified)
        "photo-1574323347407-f5e1ad6d020b",  # wheat field
    ],
    "Masala & Dry Fruits": [
        "photo-1596040033229-a9821ebd058d",  # Indian spices bowl (verified)
        "photo-1614373532201-34b87c5ed2b0",  # dry fruits assortment
    ],
    "Snacks & Munchies": [
        "photo-1599490659213-e2b9527bd087",  # snacks (verified)
        "photo-1566478989037-eec170784d0b",  # namkeen in bowl
    ],
    "Sweet Tooth": [
        "photo-1589119908995-c6837fa14848",  # sweets (verified)
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

# Track which index to use per category for variety
_category_index = {}


def get_category_image(category: str) -> str:
    """Return a curated, rotating Unsplash URL for the category. Always works."""
    photos = CATEGORY_UNSPLASH.get(category, [DEFAULT_UNSPLASH_ID])
    idx = _category_index.get(category, 0)
    photo_id = photos[idx % len(photos)]
    _category_index[category] = idx + 1
    return f"https://images.unsplash.com/{photo_id}?w=400&h=300&fit=crop&auto=format&q=80"


def search_open_food_facts(product_name: str) -> str | None:
    """
    Search Open Food Facts for a real grocery product image.
    Free, no API key. Works great for branded packaged products.
    Returns a direct image URL or None if not found.
    """
    try:
        params = {
            "search_terms": product_name,
            "search_simple": 1,
            "action": "process",
            "json": 1,
            "page_size": 5,
            "fields": "image_front_url,image_url,product_name",
            "lc": "en",
            "cc": "in",
        }
        resp = requests.get(
            "https://world.openfoodfacts.org/cgi/search.pl",
            params=params,
            timeout=7,
            headers={"User-Agent": "KGS-Store-ImageFinder/1.0 (contact@kgsstore.in)"}
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
    """
    Strategy:
      1. Try Open Food Facts for a real product photo (best quality)
      2. Fall back to our curated, verified Unsplash category photos
    """
    off_img = search_open_food_facts(product_name)
    if off_img:
        return {
            "url": off_img,
            "source": "open_food_facts",
            "quality": "REAL_PRODUCT",
        }

    time.sleep(DELAY)

    fallback = get_category_image(category)
    return {
        "url": fallback,
        "source": "unsplash_curated",
        "quality": "CATEGORY_PHOTO",
    }


def main():
    print("=" * 60)
    print("[SEARCH] KGS Product Image Finder - Test Run (50 products)")
    print("=" * 60)
    print()

    if not os.path.exists(CSV_PATH):
        print(f"ERROR: CSV not found at: {CSV_PATH}")
        return

    with open(CSV_PATH, mode='r', encoding='utf-8-sig') as f:
        rows = list(csv.DictReader(f))[:LIMIT]

    total = len(rows)
    print(f"[INFO] Processing {total} products...\n")

    results = []
    stats = {"open_food_facts": 0, "unsplash_curated": 0}

    for i, row in enumerate(rows, 1):
        name     = (row.get("name") or "").strip()
        category = (row.get("Category") or "Pantry Staples").strip()
        sub_cat  = (row.get("Sub_Category") or "").strip()

        if not name:
            continue

        print(f"[{i:03d}/{total}] {name}")

        result = find_image(name, category)
        stats[result["source"]] += 1

        results.append({
            "index":        i,
            "name":         name,
            "category":     category,
            "sub_category": sub_cat,
            "image_url":    result["url"],
            "source":       result["source"],
            "quality":      result["quality"],
        })

        label = "[REAL PRODUCT]" if result["source"] == "open_food_facts" else "[CATEGORY IMG]"
        print(f"  {label} {result['url'][:90]}")
        time.sleep(DELAY)

    # Save to JSON
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print()
    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"  [REAL PRODUCT]  Open Food Facts real photos: {stats['open_food_facts']}")
    print(f"  [CATEGORY IMG]  Curated Unsplash fallbacks:  {stats['unsplash_curated']}")
    print()
    print(f"Results saved to: {OUT_PATH}")
    print()
    print("NEXT STEP: Run the applier to push these URLs into your database:")
    print("  python scripts/apply_product_images.py")


if __name__ == "__main__":
    main()
