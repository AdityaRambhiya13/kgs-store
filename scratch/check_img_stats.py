
import sqlite3
import json

def check_images():
    conn = sqlite3.connect('app/store.db')
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, image_url FROM products")
    rows = cursor.fetchall()
    
    stats = {
        "total": len(rows),
        "none": 0,
        "empty": 0,
        "unsplash": 0,
        "supabase": 0,
        "static": 0,
        "other": []
    }
    
    supabase_base = "https://iezqlltomqrdkgogdgqu.supabase.co"
    
    for rid, name, url in rows:
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
        else:
            stats["other"].append({"id": rid, "name": name, "url": url})
            
    print(json.dumps(stats, indent=2))
    conn.close()

if __name__ == "__main__":
    check_images()
