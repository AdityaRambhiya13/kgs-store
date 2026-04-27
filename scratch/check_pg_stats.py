
import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv('app/.env')
DATABASE_URL = os.getenv("DATABASE_URL")

def check_postgres_images():
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, name, image_url FROM products")
    rows = cur.fetchall()
    
    stats = {
        "total": len(rows),
        "none": 0,
        "empty": 0,
        "unsplash": 0,
        "supabase": 0,
        "static": 0,
        "placeholder": 0,
        "other": []
    }
    
    supabase_base = "https://iezqlltomqrdkgogdgqu.supabase.co"
    placeholder_base64 = "data:image/svg+xml;base64"
    
    for row in rows:
        url = row['image_url']
        if url is None:
            stats["none"] += 1
        elif url == "":
            stats["empty"] += 1
        elif "unsplash" in url:
            stats["unsplash"] += 1
        elif supabase_base in url:
            stats["supabase"] += 1
        elif "/api/static/" in url:
            stats["static"] += 1
        elif placeholder_base64 in url:
            stats["placeholder"] += 1
        else:
            stats["other"].append({"id": row['id'], "name": row['name'], "url": url})
            
    print(json.dumps(stats, indent=2))
    conn.close()

if __name__ == "__main__":
    import psycopg2.extras
    check_postgres_images()
