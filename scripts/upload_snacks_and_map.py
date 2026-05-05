"""
upload_snacks_and_map.py
========================
Step 1 — Upload every image from 'snacks and munchies -1' to the Supabase
         'products' bucket (upsert so re-runs are safe).
Step 2 — Match each uploaded filename to a product in the DB using the same
         normalisation logic as generate_mapping.py.
Step 3 — Update image_url for every matched product.

Run from the project root:
    python scripts/upload_snacks_and_map.py
"""

import os
import re
import sys
import requests
import psycopg2
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
load_dotenv("app/.env")

DATABASE_URL = os.getenv("DATABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

# Derive Supabase project URL from DATABASE_URL if not explicit
if "postgres." in DATABASE_URL:
    PROJECT_ID = DATABASE_URL.split("postgres.")[1].split(":")[0]
else:
    PROJECT_ID = DATABASE_URL.split("@")[1].split(".")[0] if "@" in DATABASE_URL else ""

SUPABASE_URL = os.getenv("SUPABASE_URL", f"https://{PROJECT_ID}.supabase.co")
BUCKET_NAME  = "products"
PUBLIC_BASE  = f"{SUPABASE_URL}/storage/v1/object/public/{BUCKET_NAME}"

# Folder containing the snacks & munchies images (relative to project root)
IMAGE_FOLDER = Path("snacks and munchies -1")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize(text: str) -> str:
    """Lowercase, strip weights/units, strip punctuation, collapse spaces."""
    if not text:
        return ""
    # Remove file extension
    text = os.path.splitext(text)[0]
    # Remove weight patterns: 250g, 500gm, 1kg, 200ml, etc.
    text = re.sub(r"\d+\s*(g|gm|gms|kg|ml|ltr|units?|rs|/-)\b", "", text, flags=re.IGNORECASE)
    # Remove all non-word characters (punctuation, special chars)
    text = re.sub(r"[^\w\s]", " ", text)
    # Collapse and lowercase
    return " ".join(text.lower().split())


def get_images(folder: Path) -> list[Path]:
    exts = {".webp", ".jpg", ".jpeg", ".png"}
    return [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in exts]


# ---------------------------------------------------------------------------
# Step 1: Upload
# ---------------------------------------------------------------------------

def upload_images(images: list[Path]) -> list[str]:
    """Upload images to Supabase; returns list of storage paths that succeeded."""
    if not SUPABASE_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not found in app/.env")
        sys.exit(1)

    print(f"\n{'='*60}")
    print(f"STEP 1 — Uploading {len(images)} images to bucket '{BUCKET_NAME}'")
    print(f"{'='*60}")

    headers = {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "x-upsert": "true",
    }

    uploaded = []
    failed   = []

    for img_path in images:
        storage_path = img_path.name  # flat — just the filename, no subfolder
        url = f"{SUPABASE_URL}/storage/v1/object/{BUCKET_NAME}/{storage_path}"

        # Determine content-type
        ext = img_path.suffix.lower()
        content_type = {
            ".webp": "image/webp",
            ".jpg":  "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png":  "image/png",
        }.get(ext, "application/octet-stream")

        req_headers = {**headers, "Content-Type": content_type}

        try:
            with open(img_path, "rb") as fh:
                resp = requests.post(url, headers=req_headers, data=fh, timeout=30)

            if resp.status_code in (200, 201):
                print(f"  OK  {storage_path}")
                uploaded.append(storage_path)
            else:
                print(f"  FAIL  {storage_path} -> {resp.status_code}: {resp.text[:120]}")
                failed.append(storage_path)
        except Exception as exc:
            print(f"  FAIL  {storage_path} -> Exception: {exc}")
            failed.append(storage_path)

    print(f"\nUpload done — {len(uploaded)} OK, {len(failed)} failed.")
    return uploaded


# ---------------------------------------------------------------------------
# Step 2 & 3: Match + Update DB
# ---------------------------------------------------------------------------

def match_and_update(uploaded_names: list[str]) -> None:
    """Match uploaded filenames to products and update image_url in the DB."""
    print(f"\n{'='*60}")
    print(f"STEP 2 — Matching {len(uploaded_names)} images to products")
    print(f"{'='*60}")

    # Build lookup maps for uploaded files
    # norm_name  → original_filename
    norm_to_file      = {normalize(n): n for n in uploaded_names}
    condensed_to_file = {normalize(n).replace(" ", ""): n for n in uploaded_names}

    # Fetch all products from DB
    conn = psycopg2.connect(DATABASE_URL)
    cur  = conn.cursor()
    cur.execute("SELECT id, name FROM products")
    products = cur.fetchall()

    print(f"  DB has {len(products)} total products.")

    matched   = []
    no_match  = []

    for p_id, p_name in products:
        p_norm      = normalize(p_name)
        p_condensed = p_norm.replace(" ", "")

        img_file = None

        # Priority 1: exact normalised filename match
        if p_norm in norm_to_file:
            img_file = norm_to_file[p_norm]

        # Priority 2: condensed match ("chanadal" vs "chana dal")
        elif p_condensed in condensed_to_file:
            img_file = condensed_to_file[p_condensed]

        # Priority 3: product name contains the full image filename as sub-words
        else:
            for img_norm, fname in norm_to_file.items():
                if len(img_norm) > 3 and (f" {img_norm} " in f" {p_norm} "):
                    img_file = fname
                    break

        if img_file:
            matched.append((p_id, p_name, img_file))
        else:
            no_match.append(p_name)

    print(f"\n  Matched  : {len(matched)}")
    print(f"  No match : {len(no_match)}")

    if not matched:
        print("\nNothing to update.")
        cur.close()
        conn.close()
        return

    # ------------------------------------------------------------------
    print(f"\n{'='*60}")
    print(f"STEP 3 — Updating {len(matched)} products with Supabase URLs")
    print(f"{'='*60}")

    updated = 0
    for p_id, p_name, img_file in matched:
        img_url = f"{PUBLIC_BASE}/{img_file}"
        cur.execute(
            "UPDATE products SET image_url = %s WHERE id = %s",
            (img_url, p_id),
        )
        updated += 1
        print(f"  OK  [{p_id}] {p_name}  ->  {img_file}")

    conn.commit()
    cur.close()
    conn.close()

    print(f"\nDB update done — {updated} products updated.")

    if no_match:
        print(f"\nProducts with NO image match ({len(no_match)}):")
        for name in no_match[:20]:
            print(f"  - {name}")
        if len(no_match) > 20:
            print(f"  … and {len(no_match) - 20} more.")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    if not IMAGE_FOLDER.exists():
        print(f"ERROR: Folder '{IMAGE_FOLDER}' not found. Run from the project root.")
        sys.exit(1)

    images = get_images(IMAGE_FOLDER)
    if not images:
        print(f"ERROR: No images found in '{IMAGE_FOLDER}'.")
        sys.exit(1)

    print(f"Found {len(images)} images in '{IMAGE_FOLDER}'.")

    uploaded_names = upload_images(images)

    if not uploaded_names:
        print("No images were uploaded successfully. Aborting DB update.")
        sys.exit(1)

    match_and_update(uploaded_names)

    print(f"\n{'='*60}")
    print("ALL DONE! Images uploaded & product URLs updated.")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
