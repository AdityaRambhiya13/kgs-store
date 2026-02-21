# ============================================================
# main.py — FastAPI Backend
# ============================================================
import os
import re
import json
import time
from typing import List, Optional
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import bcrypt
import jwt
import uvicorn
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from dotenv import load_dotenv

import firebase_admin
from firebase_admin import credentials, auth as firebase_auth

from database import (
    init_db, get_all_products, create_order,
    get_all_orders, get_order_by_token, update_order_status, mark_delivered,
    get_orders_by_phone, get_customer, create_or_update_customer, get_all_customers,
)
from models import OrderCreate, OrderOut, OrderStatusUpdate, ProductOut, OTPRequest, OTPVerifyRequest, CustomerOut
from websocket import manager

load_dotenv()

# Initialize Firebase Admin
try:
    # Option 1: Load from Environment Variable (Best for Render/Vercel)
    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if service_account_json:
        # Load JSON from string if it starts with { (otherwise it might be a path)
        if service_account_json.strip().startswith("{"):
            print("🔧 Initializing Firebase Admin from environment variable...")
            cred_dict = json.loads(service_account_json)
            cred = credentials.Certificate(cred_dict)
        else:
            print(f"🔧 Initializing Firebase Admin from path: {service_account_json}")
            cred = credentials.Certificate(service_account_json)
    else:
        # Option 2: Fallback to local file
        print("🔧 Initializing Firebase Admin from local file (firebase-adminsdk.json)...")
        cred = credentials.Certificate("firebase-adminsdk.json")
    
    firebase_admin.initialize_app(cred)
except Exception as e:
    print(f"⚠️ Firebase Admin initialization failed: {e}")

ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")
SECRET_KEY     = os.getenv("SECRET_KEY", "quickshop-secret-key-change-in-production")

# ── Rate Limiting ─────────────────────────────────────────
rate_limit_store: dict = {}
RATE_LIMIT  = int(os.getenv("RATE_LIMIT", "60"))
RATE_WINDOW = 60

def check_rate_limit(request: Request, limit: int = RATE_LIMIT, window: int = RATE_WINDOW, scope: str = "global"):
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{scope}"
    now = time.time()
    if key not in rate_limit_store:
        rate_limit_store[key] = []
    rate_limit_store[key] = [t for t in rate_limit_store[key] if now - t < window]
    if len(rate_limit_store[key]) >= limit:
        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")
    rate_limit_store[key].append(now)

def verify_admin_password(password: str) -> bool:
    return password == ADMIN_PASSWORD

# ── JWT Authentication ─────────────────────────────────────
security = HTTPBearer()
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta):
    to_encode = data.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire.timestamp()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Not an admin")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_current_customer(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("role") != "customer":
            raise HTTPException(status_code=403, detail="Not a customer")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    print(f"CRITICAL UNHANDLED ERROR: {exc}\n{traceback.format_exc()}")
    return JSONResponse(status_code=500, content={"detail": "Something went wrong. Please try again later."})

# ── Products ──────────────────────────────────────────────
@app.get("/api/products", response_model=List[ProductOut])
def list_products(request: Request):
    check_rate_limit(request)
    return get_all_products()

# ── Orders ────────────────────────────────────────────────
@app.post("/api/orders")
def place_order(order: OrderCreate, request: Request):
    check_rate_limit(request, limit=3, window=600, scope="orders")
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
def list_orders(request: Request, admin: dict = Depends(get_current_admin)):
    check_rate_limit(request)
    return get_all_orders()

@app.get("/api/admin/customers", response_model=List[CustomerOut])
def list_customers(request: Request, admin: dict = Depends(get_current_admin)):
    check_rate_limit(request)
    return get_all_customers()

@app.get("/api/orders/history")
def order_history(request: Request, customer: dict = Depends(get_current_customer)):
    check_rate_limit(request)
    phone = customer.get("phone")
    return get_orders_by_phone(phone)

@app.get("/api/orders/{token}")
def get_order(token: str, request: Request):
    check_rate_limit(request)
    order = get_order_by_token(token)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

@app.patch("/api/orders/{token}/status")
async def toggle_order_status(token: str, body: OrderStatusUpdate, request: Request, admin: dict = Depends(get_current_admin)):
    check_rate_limit(request)
    if body.status == "Delivered":
        order = get_order_by_token(token)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        if order["delivery_type"] == "delivery":
            if not body.otp:
                raise HTTPException(status_code=400, detail="Delivery OTP is required for home deliveries")
            if body.otp != order["delivery_otp"]:
                raise HTTPException(status_code=400, detail="Invalid Delivery OTP")
        updated = mark_delivered(token)
    else:
        updated = update_order_status(token, body.status)

    if not updated:
        raise HTTPException(status_code=404, detail="Order not found")

    await manager.broadcast_all({"type": "status_update", "token": token, "status": body.status})
    return {"token": token, "status": body.status}

# ── Authentication ─────────────────────────────────────
class AdminLoginInfo(BaseModel):
    password: str

@app.post("/api/auth/admin-login")
def admin_login(body: AdminLoginInfo, request: Request):
    check_rate_limit(request, limit=5, window=60, scope="admin-auth")
    if not verify_admin_password(body.password):
        raise HTTPException(status_code=401, detail="Invalid admin password")
    token = create_access_token({"role": "admin"}, timedelta(hours=12))
    return {"access_token": token, "role": "admin"}

otp_store = {}

@app.post("/api/auth/send-otp")
def send_otp(body: OTPRequest, request: Request):
    """Check if user exists and prepare for Firebase auth."""
    check_rate_limit(request, limit=5, window=60, scope="auth")
    customer = get_customer(body.phone)
    is_new = customer is None
    return {"message": "Ready for verification", "is_new": is_new}

@app.post("/api/auth/verify-otp")
def verify_otp(body: OTPVerifyRequest, request: Request):
    """Verify Firebase Token and sign in or sign up."""
    check_rate_limit(request, limit=5, window=60, scope="auth")
    verified_phone = None

    if body.firebase_token:
        try:
            decoded_token = firebase_auth.verify_id_token(body.firebase_token)
            verified_phone = decoded_token.get('phone_number')
            if verified_phone.startswith("+91"):
                verified_phone = verified_phone[3:]
        except Exception as e:
            print(f"❌ Firebase verification failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid code or session expired")
    
    if not verified_phone:
        raise HTTPException(status_code=400, detail="Verification failed: No valid token provided")

    customer = get_customer(verified_phone)
    if not customer:
        if not body.name or not body.address:
             raise HTTPException(status_code=400, detail="Name and Address are required for new users")
        create_or_update_customer(verified_phone, body.name, body.address)
        customer = get_customer(verified_phone)
        
    token = create_access_token({"role": "customer", "phone": verified_phone}, timedelta(days=7))
    return {
        "verified": True,
        "phone": verified_phone,
        "name": customer.get("name"),
        "address": customer.get("address"),
        "access_token": token
    }

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

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
