import psycopg2
import os
import json
import re
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')
IMAGE_DIR = 'app/static/product_images'

def normalize(text):
    if not text: return ""
    # Remove extensions if present
    if '.' in text:
        text = os.path.splitext(text)[0]
    
    # Remove common weight patterns like 250g, 500gm, 1kg, 1 ltr, etc.
    # Added common variations like 250 g, 500 gm
    text = re.sub(r'\d+\s*(g|gm|gms|kg|ml|ltr|units?|rs|/-)\b', '', text, flags=re.IGNORECASE)
    
    # Handle concatenated words like "chanadal" -> "chana dal" (common in filenames)
    # We'll do this by adding spaces before capital letters if it looks like camelCase, 
    # but most filenames are lowercase.
    
    # Remove punctuation and special chars
    text = re.sub(r'[^\w\s]', ' ', text)
    # Collapse whitespace and lowercase
    return " ".join(text.lower().split())

def main():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    
    # Get all products
    cur.execute("SELECT id, name FROM products")
    db_products = cur.fetchall()
    
    # Get all images recursively
    images = []
    for root, dirs, files in os.walk(IMAGE_DIR):
        for file in files:
            if file.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')):
                # Get path relative to IMAGE_DIR
                rel_path = os.path.relpath(os.path.join(root, file), IMAGE_DIR)
                # Convert backslashes to forward slashes for URLs
                rel_path = rel_path.replace('\\', '/')
                images.append(rel_path)
    
    mapping = {
        "perfect_matches": [],
        "potential_matches": [],
        "no_match_images": [],
        "products_missing_images": []
    }
    
    image_used = set()
    product_mapped = set()
    
    # Create different lookup maps
    # 1. Full relative path normalized: "biscuits/parle-g" -> "biscuits parle g"
    norm_path_to_img = {normalize(img): img for img in images}
    # 2. Filename only normalized: "parle-g" -> "parle g"
    norm_file_to_img = {normalize(os.path.basename(img)): img for img in images}
    # 3. Condensed filename (no spaces): "chanadal" -> "chanadal"
    condensed_file_to_img = {normalize(os.path.basename(img)).replace(" ", ""): img for img in images}
    
    # Pass 1: Perfect & Strong Matches
    for p_id, p_name in db_products:
        p_norm = normalize(p_name)
        p_condensed = p_norm.replace(" ", "")
        
        # Priority 1: Match filename exactly (normalized)
        if p_norm in norm_file_to_img:
            img_file = norm_file_to_img[p_norm]
            mapping["perfect_matches"].append({
                "product_id": p_id,
                "product_name": p_name,
                "image_file": img_file
            })
            image_used.add(img_file)
            product_mapped.add(p_id)
        # Priority 2: Match condensed filename (handles "chanadal" vs "chana dal")
        elif p_condensed in condensed_file_to_img:
            img_file = condensed_file_to_img[p_condensed]
            mapping["perfect_matches"].append({
                "product_id": p_id,
                "product_name": p_name,
                "image_file": img_file
            })
            image_used.add(img_file)
            product_mapped.add(p_id)
        # Priority 3: Match if product name contains the full filename as words
        # Example: Product "Amul Butter 500G" matches "amul butter.webp"
        else:
            found_strong = False
            for img_norm, img_file in norm_file_to_img.items():
                if len(img_norm) > 3 and (f" {img_norm} " in f" {p_norm} "):
                    mapping["perfect_matches"].append({
                        "product_id": p_id,
                        "product_name": p_name,
                        "image_file": img_file
                    })
                    image_used.add(img_file)
                    product_mapped.add(p_id)
                    found_strong = True
                    break
            
            if not found_strong and p_norm in norm_path_to_img:
                img_file = norm_path_to_img[p_norm]
                mapping["perfect_matches"].append({
                    "product_id": p_id,
                    "product_name": p_name,
                    "image_file": img_file
                })
                image_used.add(img_file)
                product_mapped.add(p_id)

    # Pass 2: Potential Matches
    for p_id, p_name in db_products:
        if p_id in product_mapped:
            continue
            
        p_norm = normalize(p_name)
        p_words = set(p_norm.split())
        
        found_partial = False
        for img in images:
            img_base_norm = normalize(os.path.basename(img))
            img_words = set(img_base_norm.split())
            
            # Check if all words in image filename are in product name or vice versa
            # Or if one is a substring of the other (after removing spaces)
            p_condensed = p_norm.replace(" ", "")
            img_condensed = img_base_norm.replace(" ", "")
            
            if (img_words and img_words.issubset(p_words)) or \
               (p_words and p_words.issubset(img_words)) or \
               (img_condensed and p_condensed and (img_condensed in p_condensed or p_condensed in img_condensed)):
                
                mapping["potential_matches"].append({
                    "product_id": p_id,
                    "product_name": p_name,
                    "potential_image": img
                })
                found_partial = True
                break
        
        if not found_partial:
            mapping["products_missing_images"].append({
                "product_id": p_id,
                "product_name": p_name
            })

    # Find images that weren't used
    for img in images:
        if img not in image_used:
            mapping["no_match_images"].append(img)
            
    # Save report
    with open('scripts/mapping_report.json', 'w') as f:
        json.dump(mapping, f, indent=2)
        
    print(f"Report generated: scripts/mapping_report.json")
    print(f"Perfect Matches: {len(mapping['perfect_matches'])}")
    print(f"Potential Matches: {len(mapping['potential_matches'])}")
    print(f"Unmatched Images: {len(mapping['no_match_images'])}")
    
    conn.close()

if __name__ == "__main__":
    main()

