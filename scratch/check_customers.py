
import requests
import json

BASE_URL = "http://localhost:8000"

def test_reset_flow():
    # 1. Forgot PIN
    phone = "9035585579" # Replace with a real registered phone if known, or I'll check DB first
    # Let's check DB first to find a registered user
    return

if __name__ == "__main__":
    # I'll just check the DB first
    import psycopg2
    import os
    from dotenv import load_dotenv
    load_dotenv('app/.env')
    DATABASE_URL = os.getenv("DATABASE_URL")
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT phone, name FROM customers LIMIT 5")
    print("Sample customers:", cur.fetchall())
    conn.close()
