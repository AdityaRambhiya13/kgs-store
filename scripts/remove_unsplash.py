import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv('DATABASE_URL')

PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjIwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNmM2Y0ZjYiLz48dGV4dCB4PSI1MCUiIHk9IjUwJSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjgwIiBmaWxsPSIjOWNhM2FmIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIj4/PC90ZXh0Pjwvc3ZnPg=="

def remove_unsplash():
    conn = psycopg2.connect(DATABASE_URL)
    try:
        cur = conn.cursor()
        
        # Update products that still have unsplash URLs
        cur.execute("UPDATE products SET image_url = %s WHERE image_url LIKE '%%unsplash%%'", (PLACEHOLDER,))
        updated_count = cur.rowcount
        
        # Also handle any potentially empty or broken URLs
        cur.execute("UPDATE products SET image_url = %s WHERE image_url IS NULL OR image_url = '' OR image_url = 'PLACEHOLDER'", (PLACEHOLDER,))
        
        conn.commit()
        print(f"Successfully removed Unsplash URLs from {updated_count} products.")
        print(f"All products now use the SVG '?' placeholder.")
        
    finally:
        conn.close()

if __name__ == "__main__":
    remove_unsplash()
