import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('app/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

matches = {
    "Himalaya Moisturizing Baby Soap 75G": "/api/static/product_images/himalaya_moisturizing_baby_soap.webp",
    "Himalaya Refreshing Baby Soap 75G": "/api/static/product_images/himalaya_refreshing_baby_soap.webp",
    "Kellogs Muesli 500G": "/api/static/product_images/kellogs_muesli.webp"
}

print("Updating local image matches...")

for name, url in matches.items():
    print(f"  [UPDATE] {name} -> {url}")
    cur.execute("UPDATE products SET image_url = %s WHERE name = %s;", (url, name))

conn.commit()
print("✅ Done! Products updated in database.")
conn.close()
