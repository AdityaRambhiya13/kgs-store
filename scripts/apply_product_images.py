"""
apply_product_images.py
=======================
Reads image_results.json and updates the database with found image URLs.

Run AFTER find_product_images.py:
  python scripts/apply_product_images.py
"""

import json
import os
import sys
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

# ── Load .env from the app directory ─────────────────────
ROOT_DIR = os.path.dirname(os.path.dirname(__file__))
APP_DIR  = os.path.join(ROOT_DIR, "app")
load_dotenv(os.path.join(APP_DIR, ".env"))

DATABASE_URL  = os.getenv("DATABASE_URL")
RESULTS_PATH  = os.path.join(ROOT_DIR, "scripts", "image_results.json")

def main():
    print("=" * 60)
    print("KGS Product Image Applier")
    print("=" * 60)

    # ── Validate inputs ───────────────────────────────────
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not found in app/.env")
        print("       Make sure your app/.env file has DATABASE_URL set.")
        sys.exit(1)

    if not os.path.exists(RESULTS_PATH):
        print(f"ERROR: Results file not found: {RESULTS_PATH}")
        print("       Run find_product_images.py first.")
        sys.exit(1)

    with open(RESULTS_PATH, encoding="utf-8") as f:
        results = json.load(f)

    print(f"Loaded {len(results)} image results from JSON\n")

    # ── Separate real images from category fallbacks ──────
    to_update = [r for r in results if r["source"] == "open_food_facts"]
    cat_imgs  = [r for r in results if r["source"] != "open_food_facts"]

    print(f"  [REAL PRODUCT]  Will update: {len(to_update)} products with Open Food Facts photos")
    print(f"  [CATEGORY IMG]  Will update: {len(cat_imgs)} products with curated category photos")
    total_to_update = len(results)
    print(f"  Total to update: {total_to_update}")
    print()

    # ── Connect to PostgreSQL ─────────────────────────────
    try:
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        print("Connected to database successfully\n")
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        sys.exit(1)

    updated = 0
    skipped = 0

    try:
        cursor = conn.cursor()

        for item in results:
            name      = item["name"]
            image_url = item["image_url"]
            source    = item["source"]
            quality   = item["quality"]

            # Match by exact product name
            cursor.execute(
                "SELECT id FROM products WHERE name = %s LIMIT 1",
                (name,)
            )
            row = cursor.fetchone()

            if row:
                product_id = row["id"]
                cursor.execute(
                    "UPDATE products SET image_url = %s WHERE id = %s",
                    (image_url, product_id)
                )
                updated += 1
                label = "[REAL]" if quality == "REAL_PRODUCT" else "[CAT] "
                print(f"  {label} [{product_id}] {name[:50]}")
            else:
                skipped += 1
                print(f"  [SKIP] Not found in DB: {name}")

        conn.commit()
        print()
        print("=" * 60)
        print(f"Done! Updated: {updated}  |  Skipped: {skipped}")
        print()
        print("Your product catalog will now show images for all users.")
        print("Restart the backend server if it is running for cache to clear.")

    except Exception as e:
        conn.rollback()
        print(f"\nERROR during update: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
