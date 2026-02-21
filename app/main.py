# ============================================================
# main.py — FastAPI Backend
# ============================================================
import os
import re
import json
import time
from typing import List
from contextlib import asynccontextmanager

import bcrypt
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import (
    init_db, get_all_products, create_order,
    get_all_orders, get_order_by_token, update_order_status, mark_delivered,
    get_orders_by_phone, get_customer, create_or_update_customer, get_all_customers,
)
from models import OrderCreate, OrderOut, OrderStatusUpdate, ProductOut, CustomerAuth, CustomerOut
from websocket import manager

load_dotenv()

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
SECRET_KEY     = os.getenv("SECRET_KEY", "quickshop-secret-key-change-in-production")

# ── Rate Limiting ─────────────────────────────────────────
rate_limit_store: dict = {}
RATE_LIMIT  = int(os.getenv("RATE_LIMIT", "60"))
RATE_WINDOW = 60

def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    if client_ip not in rate_limit_store:
        rate_limit_store[client_ip] = []
    rate_limit_store[client_ip] = [t for t in rate_limit_store[client_ip] if now - t < RATE_WINDOW]
    if len(rate_limit_store[client_ip]) >= RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    rate_limit_store[client_ip].append(now)

def verify_admin_password(password: str) -> bool:
    return password == ADMIN_PASSWORD

def _clean_phone(phone: str) -> str:
    """Strip +91, spaces, dashes. Return 10-digit number."""
    cleaned = re.sub(r"[\s\-\+]", "", phone)
    if cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    return cleaned

# ── Lifecycle ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    print("=" * 55)
    print("🌾 KGS Grain Store — FastAPI Backend v3.0")
    print("=" * 55)
    print("📡 API:   http://localhost:8000")
    print("📋 Docs:  http://localhost:8000/docs")
    print("=" * 55)
    yield

# ── FastAPI App ───────────────────────────────────────────
app = FastAPI(
    title="KGS Grain Store — Virtual Queue API",
    description="REST API for the KGS Virtual Queue & Digital Storefront",
    version="3.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Products ──────────────────────────────────────────────

@app.get("/api/products", response_model=List[ProductOut])
def list_products(request: Request):
    check_rate_limit(request)
    return get_all_products()

# ── Orders ────────────────────────────────────────────────

@app.post("/api/orders")
def place_order(order: OrderCreate, request: Request):
    check_rate_limit(request)
    products = {p["id"]: p for p in get_all_products()}
    validated_items = []
    calculated_total = 0.0

    for item in order.items:
        if item.product_id not in products:
            raise HTTPException(status_code=400, detail=f"Product ID {item.product_id} not found")
        product = products[item.product_id]
        subtotal = product["price"] * item.quantity
        calculated_total += subtotal
        validated_items.append({
            "product_id": item.product_id,
            "name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "subtotal": subtotal,
        })

    if abs(calculated_total - order.total) > 1.0:
        raise HTTPException(status_code=400, detail="Total mismatch — please refresh and retry")

    token = create_order(order.phone, validated_items, calculated_total, order.delivery_type, order.address)
    return {"token": token, "total": calculated_total, "status": "Processing", "delivery_type": order.delivery_type, "address": order.address}

@app.get("/api/orders")
def list_orders(password: str, request: Request):
    check_rate_limit(request)
    if not verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return get_all_orders()

@app.get("/api/admin/customers", response_model=List[CustomerOut])
def list_customers(password: str, request: Request):
    check_rate_limit(request)
    if not verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    return get_all_customers()

# ── IMPORTANT: /history and /auth routes MUST be before /{token} ──

@app.get("/api/orders/history")
def order_history(phone: str, pin: str, request: Request):
    """Get all orders for a customer — requires phone + PIN."""
    check_rate_limit(request)
    cleaned = _clean_phone(phone)
    if not re.match(r"^[6-9]\d{9}$", cleaned):
        raise HTTPException(status_code=422, detail="Invalid phone number")
    customer = get_customer(cleaned)
    if not customer:
        raise HTTPException(status_code=404, detail="No account found for this number. Place an order first and set a PIN.")
    try:
        valid = bcrypt.checkpw(pin.encode(), customer["pin_hash"].encode())
    except Exception:
        raise HTTPException(status_code=500, detail="Authentication error")
    if not valid:
        raise HTTPException(status_code=401, detail="Incorrect PIN. Please try again.")
    return get_orders_by_phone(cleaned)

@app.get("/api/orders/{token}")
def get_order(token: str, request: Request):
    check_rate_limit(request)
    order = get_order_by_token(token)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.patch("/api/orders/{token}/status")
async def toggle_order_status(token: str, body: OrderStatusUpdate, password: str, request: Request):
    check_rate_limit(request)
    if not verify_admin_password(password):
        raise HTTPException(status_code=401, detail="Invalid admin password")

    if body.status == "Delivered":
        updated = mark_delivered(token)
    else:
        updated = update_order_status(token, body.status)

    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")

    await manager.broadcast_all({"type": "status_update", "token": token, "status": body.status})
    return {"token": token, "status": body.status}

# ── Customer PIN Auth ─────────────────────────────────────

@app.post("/api/auth/setup-pin")
def setup_pin(body: CustomerAuth, request: Request):
    """Set or update a customer's 4-digit security PIN."""
    check_rate_limit(request)
    pin_hash = bcrypt.hashpw(body.pin.encode(), bcrypt.gensalt()).decode()
    create_or_update_customer(body.phone, pin_hash)
    return {"message": "PIN set successfully", "phone": body.phone}

@app.post("/api/auth/verify")
def verify_customer(body: CustomerAuth, request: Request):
    """Verify phone + PIN. Returns verified status."""
    check_rate_limit(request)
    customer = get_customer(body.phone)
    if not customer:
        raise HTTPException(status_code=404, detail="No account found for this number")
    try:
        valid = bcrypt.checkpw(body.pin.encode(), customer["pin_hash"].encode())
    except Exception:
        raise HTTPException(status_code=500, detail="Authentication error")
    if not valid:
        raise HTTPException(status_code=401, detail="Incorrect PIN")
    return {"verified": True, "phone": body.phone}

# ── WebSocket ─────────────────────────────────────────────

@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    if channel not in ("customer", "admin"):
        await websocket.close(code=4000)
        return
    await manager.connect(websocket, channel)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)

# ── Health ────────────────────────────────────────────────

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "KGS Grain Store API", "version": "3.0.0"}

# ── Entry Point ───────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
