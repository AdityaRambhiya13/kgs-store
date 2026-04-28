import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'app', '.env'))
from database import get_connection, release_connection, _invalidate_products_cache

conn = get_connection()
try:
    cur = conn.cursor()
    cur.execute("UPDATE products SET category = %s WHERE category = %s", ("Wellness", "& Wellness"))
    print("Renamed '& Wellness' to 'Wellness': {} rows".format(cur.rowcount))
    conn.commit()
    _invalidate_products_cache()
    print("Done.")
finally:
    release_connection(conn)
