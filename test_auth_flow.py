import requests
import json
import time
import os
import signal
import subprocess
import sys

# Start server
server = subprocess.Popen(
    [sys.executable, "-m", "uvicorn", "main:app", "--port", "8001"], 
    cwd="app"
)
time.sleep(3) # wait for server to start

BASE = "http://localhost:8001/api"
print("\n--- Testing Auth and Cancellation APIs ---\n")

try:
    # 1. Signup
    print("1. Testing Signup...")
    res = requests.post(f"{BASE}/auth/signup", json={
        "name": "Test User",
        "phone": "9999999998",
        "email": "test8@example.com",
        "address": "123 Test St",
        "pin": "1234"
    })
    print("Signup Response:", res.status_code, res.json())

    # 2. Login
    print("\n2. Testing Login via Phone...")
    res = requests.post(f"{BASE}/auth/login", json={
        "identifier": "9999999998",
        "pin": "1234"
    })
    print("Login (Phone) Response:", res.status_code)
    token = res.json().get("access_token")

    print("\n3. Testing Login via Email...")
    res = requests.post(f"{BASE}/auth/login", json={
        "identifier": "test8@example.com",
        "pin": "1234"
    })
    print("Login (Email) Response:", res.status_code)

    headers = {"Authorization": f"Bearer {token}"}

    # Fetch a valid product ID dynamically
    prod_res = requests.get(f"{BASE}/products")
    if prod_res.status_code == 200 and prod_res.json():
        sample_product = prod_res.json()[0]
        product_id = sample_product["id"]
        product_name = sample_product["name"]
        product_price = sample_product["price"]
        print(f"Using sample product: {product_name} (ID: {product_id}, Price: {product_price})")
    else:
        product_id = 1
        product_name = "Atta"
        product_price = 120.0
        print("Could not fetch products, using fallback product ID 1")

    # 4. Create and Cancel 3 orders to hit limit
    print("\n4. Testing Order Creation and Cancellation Limit...")
    for i in range(1, 5):
        print(f"\n--- Order Iteration {i} ---")
        res = requests.post(f"{BASE}/orders", json={
            "items": [{"product_id": product_id, "quantity": 1, "name": product_name, "price": product_price}],
            "total": product_price,
            "delivery_type": "pickup"
        }, headers=headers)

        if res.status_code != 200:
            print("Create order blocked:", res.status_code, res.json())
            break
            
        order_token = res.json().get("token")
        print("Order Created:", order_token)
        
        res = requests.post(f"{BASE}/orders/{order_token}/cancel", headers=headers)
        print("Order Cancelled:", res.status_code, res.json())

    # 5. Forgot PIN
    print("\n5. Testing Forgot PIN...")
    res = requests.post(f"{BASE}/auth/forgot-pin", json={"phone": "9999999998", "old_pin": "1234"})
    print("Forgot PIN Response:", res.json())

except Exception as e:
    print("Error:", e)
finally:
    server.terminate()
