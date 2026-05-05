import psycopg2, os
from dotenv import load_dotenv
load_dotenv('app/.env')
conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND image_url != ''")
total_with_url = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM products")
total = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM products WHERE image_url LIKE '%supabase%'")
supabase_count = cur.fetchone()[0]

cur.execute("SELECT COUNT(*) FROM products WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE '%supabase%'")
other_count = cur.fetchone()[0]

cur.execute("SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != '' AND image_url NOT LIKE '%supabase%' LIMIT 5")
samples = cur.fetchall()

print(f"Total products in DB       : {total}")
print(f"Products WITH image_url    : {total_with_url}")
print(f"  -> Pointing to Supabase  : {supabase_count}")
print(f"  -> Pointing to OTHER     : {other_count}")
if samples:
    print(f"\nNon-supabase samples:")
    for row in samples:
        print(f"  [{row[0]}] {row[1]}")
        print(f"          {row[2]}")
else:
    print("\nAll existing image_urls are Supabase URLs.")

cur.close()
conn.close()
