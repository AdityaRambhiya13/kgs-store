import os
from dotenv import load_dotenv
from database import get_connection, release_connection, _invalidate_products_cache

# Load environment variables
env_path = os.path.join("app", ".env")
load_dotenv(env_path)

def clear_all_images_fast():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        print("Clearing all product image URLs using a single query...")
        cursor.execute("UPDATE products SET image_url = ''")
        count = cursor.rowcount
        conn.commit()
        _invalidate_products_cache()
        print(f"Successfully cleared {count} product images.")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        release_connection(conn)

if __name__ == "__main__":
    clear_all_images_fast()
