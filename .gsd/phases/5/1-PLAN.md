---
phase: 5
plan: 1
wave: 1
---

# Plan 5.1: Backend — Schema Migration, Grain Catalog + Customer PIN Auth

## Objective
Migrate DB schema to support: (a) product `base_name` for variant grouping, (b) `delivery_type` + `delivered_at` on orders, (c) a `customers` table with bcrypt PIN auth. Reseed all products. Add `/api/orders/history` and `/api/auth/verify` endpoints.

## Context
- app/database.py
- app/models.py
- app/main.py
- app/requirements.txt

## Tasks

<task type="auto">
  <name>Migrate schema + seed grain catalog</name>
  <files>app/database.py</files>
  <action>
    **Schema changes in `init_db()`** (add after existing CREATE TABLE statements):

    1. Add `base_name` to products table (safe migration):
       ```python
       try: conn.execute("ALTER TABLE products ADD COLUMN base_name TEXT NOT NULL DEFAULT ''")
       except: pass
       ```
    2. Add delivery columns to orders (safe migration):
       ```python
       for col, defn in [("delivery_type","TEXT NOT NULL DEFAULT 'pickup'"), ("delivered_at","TEXT")]:
           try: conn.execute(f"ALTER TABLE orders ADD COLUMN {col} {defn}")
           except: pass
       ```
    3. Create customers table:
       ```python
       cursor.execute("""
           CREATE TABLE IF NOT EXISTS customers (
               phone TEXT PRIMARY KEY,
               pin_hash TEXT NOT NULL,
               created_at TEXT NOT NULL
           )
       """)
       ```
    4. **Always reseed products** — call `_seed_products(cursor)` after deleting existing ones. Remove the `if count == 0` guard:
       ```python
       cursor.execute("DELETE FROM products")
       try: cursor.execute("DELETE FROM sqlite_sequence WHERE name='products'")
       except: pass
       _seed_products(cursor)
       ```

    **`_seed_products(cursor)` — full replacement:**
    Fields: `(name, price, description, image_url, category, base_name)`

    ```python
    RICE_IMG = "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop"
    WHEAT_IMG = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop"
    JOWARI_IMG = "https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400&h=300&fit=crop"
    BAJRI_IMG = "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=400&h=300&fit=crop"

    products = [
        # Rice
        ("Vadakolam Rice",     68,  "₹68/kg — Premium quality",  RICE_IMG, "Rice", "Vadakolam Rice"),
        ("Vadakolam Rice",     72,  "₹72/kg — Premium quality",  RICE_IMG, "Rice", "Vadakolam Rice"),
        ("Vadakolam Rice",     76,  "₹76/kg — Premium quality",  RICE_IMG, "Rice", "Vadakolam Rice"),
        ("Vadakolam Rice",     80,  "₹80/kg — Premium quality",  RICE_IMG, "Rice", "Vadakolam Rice"),
        ("MassorieKolam Rice", 44,  "₹44/kg — Premium quality",  RICE_IMG, "Rice", "MassorieKolam Rice"),
        ("Parimal Rice",       42,  "₹42/kg — Premium quality",  RICE_IMG, "Rice", "Parimal Rice"),
        ("Boiled Rice",        58,  "₹58/kg — Premium quality",  RICE_IMG, "Rice", "Boiled Rice"),
        ("Boiled Kolam Rice",  60,  "₹60/kg — Premium quality",  RICE_IMG, "Rice", "Boiled Kolam Rice"),
        ("Basmati Rice",       99,  "₹99/kg — Premium quality",  RICE_IMG, "Rice", "Basmati Rice"),
        ("Basmati Rice",      120,  "₹120/kg — Premium quality", RICE_IMG, "Rice", "Basmati Rice"),
        ("Basmati Rice",      180,  "₹180/kg — Premium quality", RICE_IMG, "Rice", "Basmati Rice"),
        ("Basmati Rice",      220,  "₹220/kg — Premium quality", RICE_IMG, "Rice", "Basmati Rice"),
        ("Broken Basmati",     60,  "₹60/kg — Premium quality",  RICE_IMG, "Rice", "Broken Basmati"),
        ("Broken Basmati",     67,  "₹67/kg — Premium quality",  RICE_IMG, "Rice", "Broken Basmati"),
        ("Broken Basmati",     77,  "₹77/kg — Premium quality",  RICE_IMG, "Rice", "Broken Basmati"),
        ("Ambemore Rice",     220,  "₹220/kg — Premium quality", RICE_IMG, "Rice", "Ambemore Rice"),
        ("Indrani Rice",       66,  "₹66/kg — Premium quality",  RICE_IMG, "Rice", "Indrani Rice"),
        ("Indrani Rice",       74,  "₹74/kg — Premium quality",  RICE_IMG, "Rice", "Indrani Rice"),
        ("Italy Rice",         52,  "₹52/kg — Premium quality",  RICE_IMG, "Rice", "Italy Rice"),
        ("Red Rice",           66,  "₹66/kg — Premium quality",  RICE_IMG, "Rice", "Red Rice"),
        ("Brown Rice",        126,  "₹126/kg — Premium quality", RICE_IMG, "Rice", "Brown Rice"),
        # Wheat
        ("Lokvan Wheat",       45,  "₹45/kg — Premium quality",  WHEAT_IMG, "Wheat", "Lokvan Wheat"),
        ("Lokvan Wheat",       52,  "₹52/kg — Premium quality",  WHEAT_IMG, "Wheat", "Lokvan Wheat"),
        ("Lokvan Wheat",       56,  "₹56/kg — Premium quality",  WHEAT_IMG, "Wheat", "Lokvan Wheat"),
        ("MPSIOR Wheat",       48,  "₹48/kg — Premium quality",  WHEAT_IMG, "Wheat", "MPSIOR Wheat"),
        ("MPSIOR Wheat",       52,  "₹52/kg — Premium quality",  WHEAT_IMG, "Wheat", "MPSIOR Wheat"),
        ("MPSIOR Wheat",       72,  "₹72/kg — Premium quality",  WHEAT_IMG, "Wheat", "MPSIOR Wheat"),
        ("MPSIOR Wheat",       76,  "₹76/kg — Premium quality",  WHEAT_IMG, "Wheat", "MPSIOR Wheat"),
        ("MPSIOR Wheat",       80,  "₹80/kg — Premium quality",  WHEAT_IMG, "Wheat", "MPSIOR Wheat"),
        ("KhapliWheat",       120,  "₹120/kg — Premium quality", WHEAT_IMG, "Wheat", "KhapliWheat"),
        # Jowari
        ("Jowari",             54,  "₹54/kg — Premium quality",  JOWARI_IMG, "Jowari", "Jowari"),
        ("Jowari",             60,  "₹60/kg — Premium quality",  JOWARI_IMG, "Jowari", "Jowari"),
        ("Jowari",             90,  "₹90/kg — Premium quality",  JOWARI_IMG, "Jowari", "Jowari"),
        # Bajri
        ("Bajri",              56,  "₹56/kg — Premium quality",  BAJRI_IMG, "Bajri", "Bajri"),
    ]
    cursor.executemany(
        "INSERT INTO products (name, price, description, image_url, category, base_name) VALUES (?,?,?,?,?,?)",
        products
    )
    ```

    **New DB functions to add:**
    ```python
    def get_customer(phone: str):
        conn = get_connection()
        row = conn.execute("SELECT * FROM customers WHERE phone = ?", (phone,)).fetchone()
        conn.close()
        return dict(row) if row else None

    def create_or_update_customer(phone: str, pin_hash: str):
        conn = get_connection()
        from datetime import datetime
        conn.execute(
            "INSERT OR REPLACE INTO customers (phone, pin_hash, created_at) VALUES (?, ?, ?)",
            (phone, pin_hash, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
        )
        conn.commit()
        conn.close()

    def get_orders_by_phone(phone: str):
        conn = get_connection()
        rows = conn.execute("SELECT * FROM orders WHERE phone = ? ORDER BY id DESC", (phone,)).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def mark_delivered(token: str) -> bool:
        conn = get_connection()
        cursor = conn.cursor()
        from datetime import datetime
        cursor.execute(
            "UPDATE orders SET status = 'Delivered', delivered_at = ? WHERE token = ?",
            (datetime.now().strftime("%Y-%m-%d %H:%M:%S"), token)
        )
        updated = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return updated
    ```

    Also update `create_order` signature: `create_order(phone, items, total, delivery_type='pickup')` — add delivery_type to the INSERT.
  </action>
  <verify>cd app && python -c "from database import init_db, get_all_products; init_db(); p=get_all_products(); print(len(p)); cats={x['category'] for x in p}; print(cats)"</verify>
  <done>Output: 34 products, categories: {'Rice', 'Wheat', 'Jowari', 'Bajri'}</done>
</task>

<task type="auto">
  <name>Add bcrypt PIN auth + update models + new API endpoints</name>
  <files>app/models.py, app/main.py, app/requirements.txt</files>
  <action>
    **requirements.txt** — add `bcrypt` if not present (check first).

    **models.py:**
    1. Add `from typing import Literal, Optional` (merge if already there).
    2. Add `delivery_type: Literal['pickup', 'delivery'] = 'pickup'` to `OrderCreate`.
    3. Change `OrderStatusUpdate` pattern to accept Delivered: `pattern=r"^(Processing|Ready for Pickup|Delivered)$"`.
    4. Add to `OrderOut`: `delivery_type: str = 'pickup'`, `delivered_at: Optional[str] = None`.
    5. Add new model:
       ```python
       class CustomerAuth(BaseModel):
           phone: str
           pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")

           @field_validator("phone")
           @classmethod
           def validate_phone(cls, v):
               cleaned = re.sub(r"[\s\-\+]", "", v)
               if cleaned.startswith("91") and len(cleaned) == 12:
                   cleaned = cleaned[2:]
               if not re.match(r"^[6-9]\d{9}$", cleaned):
                   raise ValueError("Invalid phone number")
               return cleaned
       ```

    **main.py:**
    1. `import bcrypt`, `import re` (if not present).
    2. Import `get_customer`, `create_or_update_customer`, `get_orders_by_phone`, `mark_delivered` from database.
    3. Import `CustomerAuth` from models.
    4. Pass `order.delivery_type` to `create_order()` in `POST /api/orders`. Also after creating order, call `create_or_update_customer` only if customer doesn't exist yet (don't overwrite existing PIN):
       — Check: `if not get_customer(order.phone): ...` but only when a PIN field is added to OrderCreate. Actually, PIN setup is a SEPARATE step — see endpoint below.
    5. **New endpoints** — add BEFORE `@app.get("/api/orders/{token}")`:
       ```python
       @app.post("/api/auth/setup-pin")
       def setup_pin(body: CustomerAuth, request: Request):
           """Set or update a customer's PIN. Used after first order placement."""
           check_rate_limit(request)
           existing = get_customer(body.phone)
           # Allow setup only if no existing customer, or as an update (future: require old PIN)
           pin_hash = bcrypt.hashpw(body.pin.encode(), bcrypt.gensalt()).decode()
           create_or_update_customer(body.phone, pin_hash)
           return {"message": "PIN set successfully"}

       @app.post("/api/auth/verify")
       def verify_customer(body: CustomerAuth, request: Request):
           """Verify phone + PIN. Returns verified status."""
           check_rate_limit(request)
           customer = get_customer(body.phone)
           if not customer:
               raise HTTPException(status_code=404, detail="No account found for this number")
           valid = bcrypt.checkpw(body.pin.encode(), customer["pin_hash"].encode())
           if not valid:
               raise HTTPException(status_code=401, detail="Incorrect PIN")
           return {"verified": True, "phone": body.phone}

       @app.get("/api/orders/history")
       def order_history(phone: str, pin: str, request: Request):
           """Get all orders for a phone number — requires PIN verification."""
           check_rate_limit(request)
           cleaned = re.sub(r"[\s\-\+]", "", phone)
           if cleaned.startswith("91") and len(cleaned) == 12:
               cleaned = cleaned[2:]
           if not re.match(r"^[6-9]\d{9}$", cleaned):
               raise HTTPException(status_code=422, detail="Invalid phone")
           customer = get_customer(cleaned)
           if not customer:
               raise HTTPException(status_code=404, detail="No account found")
           valid = bcrypt.checkpw(pin.encode(), customer["pin_hash"].encode())
           if not valid:
               raise HTTPException(status_code=401, detail="Incorrect PIN")
           return get_orders_by_phone(cleaned)
       ```
    6. In `PATCH /api/orders/{token}/status`: if `body.status == 'Delivered'`, call `mark_delivered(token)` instead. Still broadcast WebSocket.
  </action>
  <verify>cd app && python -c "from main import app; paths=[r.path for r in app.routes]; print([p for p in paths if 'order' in p or 'auth' in p])"</verify>
  <done>Prints routes including /api/auth/setup-pin, /api/auth/verify, /api/orders/history, /api/orders/{token} — history BEFORE {token}.</done>
</task>

## Success Criteria
- [ ] 34 products in DB: Rice (21 rows), Wheat (9), Jowari (3), Bajri (1)
- [ ] `GET /api/products` returns `base_name` field on each product
- [ ] `POST /api/auth/setup-pin` with valid phone+4-digit PIN returns 200
- [ ] `POST /api/auth/verify` with correct PIN returns `{"verified": true}`
- [ ] `GET /api/orders/history?phone=…&pin=…` returns 401 with wrong PIN
- [ ] `PATCH …/status` with `{"status":"Delivered"}` updates order correctly
