import os
import psycopg2
from psycopg2 import extras
from dotenv import load_dotenv

load_dotenv("app/.env")
DATABASE_URL = os.getenv("DATABASE_URL")

def migrate():
    print(f"Applying migration to {DATABASE_URL[:20]}...")
    conn = psycopg2.connect(DATABASE_URL)
    try:
        cursor = conn.cursor()
        cursor.execute("""
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name='products' AND column_name='mrp'
                ) THEN
                    ALTER TABLE products ADD COLUMN mrp REAL NOT NULL DEFAULT 0.0;
                    UPDATE products SET mrp = price; -- Set default mrp to current price
                END IF;
            END $$;
        """)
        conn.commit()
        print("Migration applied successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
