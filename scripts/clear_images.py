import os
from dotenv import load_dotenv
from database import init_db, get_all_products, update_product

# Load environment variables
env_path = os.path.join("app", ".env")
load_dotenv(env_path)

def clear_all_images():
    init_db()
    products = get_all_products()
    print(f"Found {len(products)} products. Clearing image URLs...")
    
    count = 0
    for p in products:
        # Clear the image_url
        success = update_product(p['id'], {'image_url': ''})
        if success:
            count += 1
            if count % 10 == 0:
                print(f"Cleared {count} products...")
    
    print(f"Successfully cleared {count} product images.")

if __name__ == "__main__":
    clear_all_images()
