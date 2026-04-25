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
    # Remove extensions
    text = os.path.splitext(text)[0]
    # Remove common weight patterns like 250g, 500gm, 1kg, 1 ltr, etc.
    text = re.sub(r'\d+\s*(g|gm|gms|kg|ml|ltr|units?|rs)\b', '', text, flags=re.IGNORECASE)
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
    
    # Get all images
    images = [f for f in os.listdir(IMAGE_DIR) if f.lower().endswith(('.webp', '.jpg', '.jpeg', '.png'))]
    
    mapping = {
        "perfect_matches": [],
        "potential_matches": [],
        "no_match_images": [],
        "products_missing_images": []
    }
    
    image_used = set()
    product_mapped = set()
    
    # Pass 1: Normalize and Match
    norm_images = {normalize(img): img for img in images}
    
    for p_id, p_name in db_products:
        p_norm = normalize(p_name)
        
        # Check for exact normalized match
        if p_norm in norm_images:
            img_file = norm_images[p_norm]
            mapping["perfect_matches"].append({
                "product_id": p_id,
                "product_name": p_name,
                "image_file": img_file
            })
            image_used.add(img_file)
            product_mapped.add(p_id)
        else:
            # Check for partial match (image name is inside product name or vice versa)
            found_partial = False
            for img_norm, img_file in norm_images.items():
                if img_norm and p_norm and (img_norm in p_norm or p_norm in img_norm):
                    mapping["potential_matches"].append({
                        "product_id": p_id,
                        "product_name": p_name,
                        "potential_image": img_file
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
