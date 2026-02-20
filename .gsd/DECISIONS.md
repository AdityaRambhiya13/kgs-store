# DECISIONS.md

## Phase 5 Decisions

**Date:** 2026-02-20

---

### 1. Product UX — Variant Modal (Blinkit/Swiggy Instamart Style)

**Decision:** Products are grouped by variety name on the catalog grid. Clicking a product card opens a **modal/bottom sheet** showing all available kg-price variants for that variety.  
**Reason:** Cleaner catalog (12 rice varieties instead of 37 rows) — consistent with leading quick-commerce apps.

**Implementation:**
- 37 product rows remain in DB but each has a `base_name` column for grouping (e.g., `"Vadakolam Rice"`)
- Frontend groups by `base_name`, shows one card per variety in the grid
- Clicking opens a `ProductVariantModal` — lists price options, user taps one, then adds to cart
- Cart entry = the specific variant (product_id, name with price, price, quantity in kg)

---

### 2. Delivery Fee

**Decision:** No delivery fee for now — just mode selection (Home Delivery / Store Pickup).  
**Reason:** Fee structure TBD later. UI toggle is purely informational at this stage.

---

### 3. Order History Security — Customer PIN System

**Decision:** Full security without SMS — use a **phone + 4-digit PIN** system (JioMart-style).  
**Reason:** No SMS/email infrastructure in scope. PIN is set by customer at order time, stored bcrypt-hashed.

**Implementation:**
- New `customers` table: `(phone TEXT PRIMARY KEY, pin_hash TEXT, created_at TEXT)`
- **First order placement:** After entering phone, customer is prompted to "Set a 4-digit security PIN for your account" (or "Login with existing PIN"). Stored hashed via bcrypt.
- **Order history access:** Enter phone + PIN → verified server-side → returns all orders for that phone.
- Backend endpoint: `POST /api/auth/verify` → `{ phone, pin }` → returns `{ verified: true/false }`
- No tokens/sessions needed — stateless PIN verification per request.

---

### 4. Quantity Unit — Kilograms

**Decision:** Quantity = kg. All displays say "3 kg" not just "3".  
**Card display:** `Product Name — ₹{price}/kg — {qty} kg — ₹{total}`  
**Confirm/Cart:** `Basmati Rice (99/kg) × 3 kg = ₹297`

---

### 5. Database Safety

**Decision:** Wipe and reseed products on each server start is acceptable. Existing orders store item names in `items_json` snapshot so they remain readable even after product table changes.
