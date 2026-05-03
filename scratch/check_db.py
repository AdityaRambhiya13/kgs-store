import sqlite3

def check_db():
    conn = sqlite3.connect('store.db')
    cursor = conn.cursor()
    
    # 1. Get all columns
    cursor.execute("PRAGMA table_info(products)")
    cols = [r[1] for r in cursor.fetchall()]
    print(f"Columns: {cols}")
    
    # 2. Check Chilati Dal
    cursor.execute("SELECT * FROM products WHERE name LIKE '%Chilati Dal%'")
    for r in cursor.fetchall():
        print("Chilati Dal Row:", dict(zip(cols, r)))
        
    # 3. Check for Maggi
    cursor.execute("SELECT name, category FROM products WHERE name LIKE '%Maggi%'")
    print("\nMaggi matches:")
    for r in cursor.fetchall():
        print(r)
        
    conn.close()

if __name__ == "__main__":
    check_db()
