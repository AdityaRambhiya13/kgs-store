# -*- coding: utf-8 -*-
# -*- coding: utf-8 -*-
# 

# main.py — FastAPI Backend

# 

import os

import re

import json

import time

from typing import List, Optional

from contextlib import asynccontextmanager

from datetime import datetime, timedelta, timezone

import hashlib



import bcrypt

import jwt

import uvicorn

import requests

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Request, Depends

from fastapi.responses import JSONResponse, FileResponse

from fastapi.staticfiles import StaticFiles

from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from pydantic import BaseModel

from dotenv import load_dotenv



import firebase_admin

from firebase_admin import credentials, auth as firebase_auth



import os

from dotenv import load_dotenv



# MUST be loaded before local imports

env_path = os.path.join(os.path.dirname(__file__), ".env")

load_dotenv(env_path)



from database import (

    init_db, get_all_products, create_order,

    get_all_orders, get_order_by_token, update_order_status, mark_delivered,

    get_orders_by_phone, get_customer, create_or_update_customer, get_all_customers,

    get_customer_by_email, update_customer_cancels,

    add_product, update_product, delete_product,

    get_favorites, add_favorite, remove_favorite,

    get_trending_products, get_personalized_recommendations

)

from models import (

    OrderCreate, OrderOut, OrderStatusUpdate, ProductOut, ProductCreate, ProductUpdate,

    OTPRequest, OTPVerifyRequest, CustomerOut, SignupRequest, LoginRequest, ForgotPinRequest, ResetPinRequest

)

from websocket import manager



# Initialize Firebase Admin

try:

    service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")

    if service_account_json:

        if service_account_json.strip().startswith("{"):

            print("Initializing Firebase Admin from environment variable...")

            cred_dict = json.loads(service_account_json)

            cred = credentials.Certificate(cred_dict)

        else:

            print(f"Initializing Firebase Admin from path: {service_account_json}")

            cred = credentials.Certificate(service_account_json)

    else:

        # Try local path first, then app/ path

        cert_path = "firebase-adminsdk.json"

        if not os.path.exists(cert_path):

            cert_path = os.path.join("app", "firebase-adminsdk.json")

            

        if os.path.exists(cert_path):

            print(f"Initializing Firebase Admin from file: {cert_path}")

            cred = credentials.Certificate(cert_path)

        else:

            print("Firebase Admin config not found (checked firebase-adminsdk.json and app/firebase-adminsdk.json)")

            raise FileNotFoundError("firebase-adminsdk.json not found")

    

    firebase_admin.initialize_app(cred)

except Exception as e:

    print(f"Firebase Admin initialization failed: {e}")



ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

SECRET_KEY     = os.getenv("SECRET_KEY", "quickshop-secret-key-change-in-production")



rate_limit_store: dict = {}

RATE_LIMIT  = int(os.getenv("RATE_LIMIT", "60"))

RATE_WINDOW = 60



# Supabase Config for Image Storage

SUPABASE_URL = "https://iezqlltomqrdkgogdgqu.supabase.co"

SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

BUCKET_NAME = "products"



import asyncio

async def cleanup_rate_limits():
    while True:
        await asyncio.sleep(600)  # Cleanup every 10 minutes
        current_time = time.time()
        keys_to_delete = []
        for key, timestamps in list(rate_limit_store.items()):
            valid_timestamps = [t for t in timestamps if current_time - t < 3600]
            if not valid_timestamps:
                keys_to_delete.append(key)
            else:
                rate_limit_store[key] = valid_timestamps
        for key in keys_to_delete:
            rate_limit_store.pop(key, None)

def check_rate_limit(request: Request, limit: int, window: int, scope: str):

    client_ip = request.client.host if request.client else "127.0.0.1"

    key = f"rate_limit:{scope}:{client_ip}"

    

    current_time = time.time()

    if key not in rate_limit_store:

        rate_limit_store[key] = []

    rate_limit_store[key] = [t for t in rate_limit_store[key] if current_time - t < window]

    if len(rate_limit_store[key]) >= limit:

        raise HTTPException(status_code=429, detail="Too many requests. Please slow down.")

    rate_limit_store[key].append(current_time)



def verify_admin_password(password: str) -> bool:
    if not password: return False
    return password.strip() == ADMIN_PASSWORD.strip()



security = HTTPBearer()

ALGORITHM = "HS256"



def create_access_token(data: dict, expires_delta: timedelta):

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + expires_delta

    to_encode.update({"exp": int(expire.timestamp())})

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



def hash_pin(pin: str) -> str:

    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def verify_pin(pin: str, hashed_pin: str) -> bool:

    try:

        return bcrypt.checkpw(pin.encode(), hashed_pin.encode())

    except ValueError:

        # Fallback for old SHA-256 hashes during migration

        return hashlib.sha256(pin.encode()).hexdigest() == hashed_pin



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



def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):

    try:

        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("role") not in ("customer", "admin"):

            raise HTTPException(status_code=403, detail="Unauthorized role")

        return payload

    except jwt.ExpiredSignatureError:

        raise HTTPException(status_code=401, detail="Token expired")

    except Exception:

        raise HTTPException(status_code=401, detail="Invalid token")



@asynccontextmanager

async def lifespan(app: FastAPI):

    init_db()

    cleanup_task = asyncio.create_task(cleanup_rate_limits())

    print("=" * 55)

    print("KGS Grain Store - FastAPI Backend v3.0")

    print("=" * 55)

    yield

    cleanup_task.cancel()



app = FastAPI(

    title="KGS Grain Store API",

    version="3.0.0",

    lifespan=lifespan,

)



app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://kgs-store.vercel.app",
        "https://kgs-store-admin.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)



from fastapi.exceptions import RequestValidationError

from fastapi.responses import JSONResponse



@app.exception_handler(RequestValidationError)

async def validation_exception_handler(request: Request, exc: RequestValidationError):

    return JSONResponse(status_code=422, content={"detail": exc.errors()})



@app.exception_handler(Exception)

async def global_exception_handler(request: Request, exc: Exception):

    return JSONResponse(status_code=500, content={"detail": "Internal server error"})



from fastapi.exceptions import HTTPException

from starlette.exceptions import HTTPException as StarletteHTTPException



@app.exception_handler(StarletteHTTPException)

async def starlette_http_exception_handler(request, exc):

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})



@app.exception_handler(HTTPException)

async def http_exception_handler(request: Request, exc: HTTPException):

    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})



@app.get("/api/products", response_model=List[ProductOut])
def list_products(request: Request):
    check_rate_limit(request, limit=120, window=60, scope="products")
    products = get_all_products()
    print(f"DEBUG: Serving {len(products)} products to public endpoint")
    return products



@app.post("/api/orders")

def place_order(order: OrderCreate, request: Request, customer_token: dict = Depends(get_current_customer)):

    # check_rate_limit(request, limit=3, window=600, scope="orders")

    

    phone = customer_token.get("phone")

    db_cust = get_customer(phone)

    if not db_cust:

        raise HTTPException(status_code=404, detail="Customer not found")

        

    try:

        cancels = json.loads(db_cust.get("cancel_timestamps", "[]"))

    except:

        cancels = []

        

    now = datetime.now()

    one_hour_ago = now - timedelta(hours=1)

    recent_cancels = [c for c in cancels if datetime.fromisoformat(c) > one_hour_ago]

    

    if len(recent_cancels) >= 3:

        raise HTTPException(status_code=403, detail="Too many cancellations. You are blocked from placing new orders for 1 hour.")

        

    if len(recent_cancels) != len(cancels):

        update_customer_cancels(phone, json.dumps(recent_cancels))



    products = {p["id"]: p for p in get_all_products()}

    validated_items = []

    calculated_total = 0.0



    for item in order.items:

        if item.product_id not in products:

            raise HTTPException(status_code=400, detail="Product not found")

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



    if order.delivery_type == "delivery" and calculated_total < 500.0:

        calculated_total += 150.0



    if abs(calculated_total - order.total) > 1.0:

        raise HTTPException(status_code=400, detail="Total mismatch")



    address_str = db_cust.get("address")

    if order.delivery_type == "delivery" and order.address:

        address_dict = order.address.model_dump()

        address_str = json.dumps(address_dict)

        if order.save_as_home:

            create_or_update_customer(phone=phone, address=address_str)



    token, delivery_otp = create_order(phone, validated_items, calculated_total, order.delivery_type, order.delivery_time, address_str)

    response = {"token": token, "total": calculated_total, "status": "Processing"}
    # Only return OTP to the customer (never visible to admin)
    if delivery_otp:
        response["delivery_otp"] = delivery_otp
    return response



@app.get("/api/orders")

def list_all_orders(request: Request, admin_token: dict = Depends(get_current_admin)):

    check_rate_limit(request, limit=60, window=60, scope="admin-orders")

    orders = get_all_orders()
    # Strip delivery OTP — admin must not know it; only customer has it
    for o in orders:
        o.pop("delivery_otp", None)
    return orders



@app.get("/api/admin/customers", response_model=List[CustomerOut])

def list_customers(request: Request, admin: dict = Depends(get_current_admin)):

    check_rate_limit(request, limit=60, window=60, scope="admin-customers")

    return get_all_customers()



@app.get("/api/orders/history")

def get_customer_orders(request: Request, customer_token: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=30, window=60, scope="customer-orders")

    return get_orders_by_phone(customer_token.get("phone"))



@app.get("/api/orders/{token}")

def get_order_details(token: str, request: Request, customer: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=60, window=60, scope="order-status")

    order = get_order_by_token(token)

    if not order or order["phone"] != customer.get("phone"):

        raise HTTPException(status_code=404, detail="Order not found")

    return order



@app.post("/api/orders/{token}/cancel")

async def cancel_customer_order(token: str, request: Request, customer_token: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=10, window=60, scope="order-cancel")

    phone = customer_token.get("phone")

    order = get_order_by_token(token)

    

    if not order or order["phone"] != phone:

        raise HTTPException(status_code=404, detail="Order not found")

        

    if order["status"] != "Processing":

        raise HTTPException(status_code=400, detail="Only 'Processing' orders can be cancelled")

        

    updated = update_order_status(token, "Cancelled")

    if not updated:

        raise HTTPException(status_code=500, detail="Failed to cancel order")

        

    db_cust = get_customer(phone)

    try:

        cancels = json.loads(db_cust.get("cancel_timestamps", "[]"))

    except:

        cancels = []

        

    now = datetime.now()

    cancels.append(now.isoformat())

    

    one_hour_ago = now - timedelta(hours=1)

    recent_cancels = [c for c in cancels if datetime.fromisoformat(c) > one_hour_ago]

    

    update_customer_cancels(phone, json.dumps(recent_cancels))

    

    await manager.broadcast_all({"type": "status_update", "token": token, "status": "Cancelled"})

    

    count = len(recent_cancels)

    if count >= 3:

        msg = f"Order cancelled. You have cancelled {count} of 3 times allowed in this hour. You are now blocked for 1 hour."

    else:

        msg = f"Order cancelled. You have cancelled {count} of 3 times allowed in this hour."

        

    return {"token": token, "status": "Cancelled", "message": msg}



@app.patch("/api/orders/{token}/status")

async def update_status(token: str, body: OrderStatusUpdate, request: Request, admin_token: dict = Depends(get_current_admin)):

    check_rate_limit(request, limit=60, window=60, scope="admin-orders-update")

    if body.status == "Delivered":

        order = get_order_by_token(token)

        if not order: raise HTTPException(status_code=404, detail="Order not found")

        if order["delivery_type"] == "delivery" and body.otp != order["delivery_otp"]:

            raise HTTPException(status_code=400, detail="Invalid Delivery OTP")

        updated = mark_delivered(token)

    else:

        updated = update_order_status(token, body.status)



    if not updated: raise HTTPException(status_code=404, detail="Update failed")

    await manager.broadcast_all({"type": "status_update", "token": token, "status": body.status})

    return {"token": token, "status": body.status}



class AdminLoginInfo(BaseModel):

    password: str



@app.post("/api/auth/admin-login")

def admin_login(body: AdminLoginInfo, request: Request):

    check_rate_limit(request, limit=5, window=60, scope="admin-auth")

    if not verify_admin_password(body.password):

        raise HTTPException(status_code=401, detail="Unauthorized")

    token = create_access_token({"role": "admin"}, timedelta(hours=12))

    return {"access_token": token, "role": "admin"}



# ── Admin Product Management ─────────────────────────────



@app.post("/api/admin/products", status_code=201)

def admin_add_product(body: ProductCreate, admin: dict = Depends(get_current_admin)):

    product_id = add_product(

        name=body.name,

        price=body.price,

        mrp=body.mrp,

        description=body.description,

        image_url=body.image_url,

        category=body.category,

        base_name=body.base_name,

        unit=body.unit

    )

    if product_id is None:

        raise HTTPException(status_code=500, detail="Failed to add product")

    return {"id": product_id, "message": "Product added successfully"}



@app.patch("/api/admin/products/{product_id}")

def admin_update_product(product_id: int, body: ProductUpdate, admin: dict = Depends(get_current_admin)):

    print(f"DEBUG: Updating product {product_id} with data: {body.model_dump(exclude_unset=True)}")

    updates = body.model_dump(exclude_unset=True)

    if not updates:

        raise HTTPException(status_code=400, detail="No update data provided")

    

    success = update_product(product_id, updates)

    if not success:

        print(f"DEBUG: Update failed for product {product_id}. Either ID doesn't exist or no rows changed.")

        raise HTTPException(status_code=404, detail="Product not found or update failed")

    

    print(f"DEBUG: Product {product_id} updated successfully!")

    return {"message": "Product updated successfully"}



@app.delete("/api/admin/products/{product_id}")

def admin_delete_product(product_id: int, admin: dict = Depends(get_current_admin)):

    success = delete_product(product_id)

    if not success:

        raise HTTPException(status_code=404, detail="Product not found or deletion failed")

    return {"message": "Product deleted successfully"}



@app.get("/api/auth/me")

def get_me(request: Request, customer: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=60, window=60, scope="auth-me")

    # Needed for checkout page to prefill data/address

    db_cust = get_customer(customer.get("phone"))

    if not db_cust:

        raise HTTPException(status_code=404, detail="Customer not found")

        

    address_data = None

    if db_cust["address"]:

        try:

            address_data = json.loads(db_cust["address"])

        except:

            pass

            

    return {"phone": db_cust["phone"], "name": db_cust["name"], "address": address_data}



class ProfileUpdateRequest(BaseModel):

    name: str



@app.patch("/api/auth/profile")

def update_profile(body: ProfileUpdateRequest, request: Request, customer: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=10, window=60, scope="auth-profile-update")

    name = body.name.strip()

    if not name or len(name) < 2:

        raise HTTPException(status_code=400, detail="Name must be at least 2 characters")

    if len(name) > 60:

        raise HTTPException(status_code=400, detail="Name too long")

    phone = customer.get("phone")

    create_or_update_customer(phone=phone, name=name)

    return {"message": "Profile updated", "name": name}



@app.get("/api/auth/check-phone")

def check_phone(phone: str, request: Request):

    check_rate_limit(request, limit=60, window=60, scope="auth-check-phone")

    # Optional endpoint to check if phone exists

    cleaned = phone.replace(" ", "").replace("-", "").replace("+", "")

    if cleaned.startswith("91") and len(cleaned) == 12:

        cleaned = cleaned.removeprefix("91")

    

    customer = get_customer(cleaned)

    return {"exists": bool(customer)}



@app.post("/api/auth/signup")

def signup(body: SignupRequest, request: Request):

    check_rate_limit(request, limit=5, window=60, scope="auth-signup")

    

    if get_customer(body.phone):

        raise HTTPException(status_code=400, detail="Phone number is already registered")

        

    pin_hash = hash_pin(body.pin)

    

    # Save user to database

    create_or_update_customer(

        phone=body.phone,

        name=body.name,

        pin_hash=pin_hash

    )

    

    token = create_access_token({"role": "customer", "phone": body.phone}, timedelta(days=7))

    return {

        "verified": True,

        "phone": body.phone,

        "name": body.name,

        "access_token": token,

        "message": "Signup successful"

    }



@app.post("/api/auth/login")

def login(body: LoginRequest, request: Request):

    check_rate_limit(request, limit=5, window=60, scope="auth-login")

    

    customer = get_customer(body.identifier)

    if not customer:

        customer = get_customer_by_email(body.identifier)

        

    if not customer:

        raise HTTPException(status_code=404, detail="User not found")

        

    if not verify_pin(body.pin, customer["pin_hash"]):

        raise HTTPException(status_code=401, detail="Incorrect PIN")

        

    token = create_access_token({"role": "customer", "phone": customer["phone"]}, timedelta(days=7))

    return {

        "verified": True,

        "phone": customer["phone"],

        "name": customer.get("name"),

        "address": customer.get("address"),

        "access_token": token

    }



@app.post("/api/auth/forgot-pin")

def forgot_pin(body: ForgotPinRequest, request: Request):

    check_rate_limit(request, limit=5, window=60, scope="forgot-pin")

    customer = get_customer(body.phone)

    if not customer:

        raise HTTPException(status_code=404, detail="Phone number not registered")

        

    reset_token = create_access_token({"role": "reset", "phone": customer["phone"]}, timedelta(minutes=15))

    

    return {

        "verified": True,

        "name": customer.get("name", "User"),

        "token": reset_token

    }



@app.post("/api/auth/reset-pin")

def reset_pin(body: ResetPinRequest, request: Request):

    check_rate_limit(request, limit=3, window=60, scope="reset-pin")

    try:

        payload = jwt.decode(body.token, SECRET_KEY, algorithms=[ALGORITHM])

        if payload.get("role") != "reset":

            raise HTTPException(status_code=400, detail="Invalid token type")

        phone = payload.get("phone")

        

        db_cust = get_customer(phone)

        if not db_cust:

            raise HTTPException(status_code=404, detail="Customer not found")

            

        new_pin_hash = hash_pin(body.new_pin)

        create_or_update_customer(phone, pin_hash=new_pin_hash)

        

        return {"message": "PIN reset successful. You can now log in."}

        

    except jwt.ExpiredSignatureError:

        raise HTTPException(status_code=400, detail="Reset token expired")

    except Exception:

        raise HTTPException(status_code=400, detail="Invalid token")



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



@app.get("/health")

def health_check():

    return {"status": "healthy"}



# ── Favorites ────────────────────────────────────────────────



@app.get("/api/favorites")

def list_favorites(request: Request, customer: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=60, window=60, scope="favorites")

    phone = customer.get("phone")

    favorite_ids = get_favorites(phone)

    # Enrich with full product data

    all_prods = {p['id']: p for p in get_all_products()}

    result = [all_prods[fid] for fid in favorite_ids if fid in all_prods]

    return result



@app.post("/api/favorites/{product_id}")

def toggle_favorite(product_id: int, request: Request, customer: dict = Depends(get_current_customer)):

    check_rate_limit(request, limit=30, window=60, scope="favorites-toggle")

    phone = customer.get("phone")

    # Check if it exists and toggle

    current_favs = get_favorites(phone)

    if product_id in current_favs:

        remove_favorite(phone, product_id)

        return {"action": "removed", "product_id": product_id}

    else:

        add_favorite(phone, product_id)

        return {"action": "added", "product_id": product_id}



# ── Recommendations ──────────────────────────────────────────



@app.get("/api/recommendations")

def get_recommendations(request: Request, customer: dict = Depends(get_current_customer)):

    """Personalized recommendations for logged-in users."""

    check_rate_limit(request, limit=30, window=60, scope="recommendations")

    phone = customer.get("phone")

    return get_personalized_recommendations(phone, limit=12)



@app.get("/api/trending")

def get_trending(request: Request):

    """Public trending products for guest/all users."""

    check_rate_limit(request, limit=30, window=60, scope="trending")

    return get_trending_products(limit=12)




@app.get("/api/admin/available-images")

def list_available_images(admin: dict = Depends(get_current_admin)):

    """Recursively list all images in the Supabase products bucket."""

    if not SUPABASE_KEY:

        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set")

        return {"images": []}

    

    all_images = []

    

    def fetch_recursive(prefix=""):

        offset = 0

        page_size = 1000

        while True:

            url = f"{SUPABASE_URL}/storage/v1/object/list/{BUCKET_NAME}"

            headers = {

                "Authorization": f"Bearer {SUPABASE_KEY}",

                "Content-Type": "application/json"

            }

            payload = {

                "prefix": prefix,

                "limit": page_size,

                "offset": offset,

                "sortBy": {"column": "name", "order": "asc"}

            }

            try:

                response = requests.post(url, headers=headers, json=payload, timeout=15)

                if response.status_code != 200:

                    print(f"Supabase Storage Error: {response.status_code} - {response.text}")

                    break

                items = response.json()

                if not items:

                    break

                for item in items:

                    name = item.get("name")

                    if not name: continue

                    full_path = f"{prefix}{name}"

                    if item.get("id"): # It's a file

                        if name.lower().endswith(('.webp', '.jpg', '.jpeg', '.png')):

                            all_images.append(full_path)

                    else: # It's a folder

                        fetch_recursive(f"{full_path}/")

                if len(items) < page_size:

                    break

                offset += page_size

            except Exception as e:

                print(f"Error in fetch_recursive: {e}")

                break



    try:

        fetch_recursive("")

        print(f"Found {len(all_images)} total images in Supabase")

        return {"images": all_images}

    except Exception as e:

        print(f"Exception in list_available_images: {str(e)}")

        return {"images": []}



        

    except Exception as e:

        print(f"Exception in list_available_images: {str(e)}")

        return {"images": []}



# ── Serve Frontend ────────────────────────────────────────

# Check if dist exists and mount it

DIST_PATH = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.exists(DIST_PATH):

    print(f"Serving frontend from: {DIST_PATH}")

    app.mount("/assets", StaticFiles(directory=os.path.join(DIST_PATH, "assets")), name="assets")

    

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # If the path starts with api/, it's a 404 for API
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
            
        # Check if requested file exists in dist (e.g. manifest.json, sw.js)
        file_path = os.path.join(DIST_PATH, full_path)
        if full_path and os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
            
        index_file = os.path.join(DIST_PATH, "index.html")
        return FileResponse(index_file)

else:

    print(f"Frontend dist not found at {DIST_PATH}. Frontend will not be served.")



if __name__ == "__main__":

    port = int(os.getenv("PORT", 8000))

    uvicorn.run(app, host="0.0.0.0", port=port)
