import requests
import json
import time
import os
import signal
import subprocess

# Start server
server = subprocess.Popen(
    ["uvicorn", "main:app", "--port", "8001"], 
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

    # 4. Create and Cancel 3 orders to hit limit
    print("\n4. Testing Order Creation and Cancellation Limit...")
    for i in range(1, 5):
        print(f"\n--- Order Iteration {i} ---")
        res = requests.post(f"{BASE}/orders", json={
            "items": [{"product_id": 1, "quantity": 1}],
            "total": 120, # The product with id 1 is Atta priced at 40/kg, wait, product 1 price is what? Let's assume there is product id 1.
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
    res = requests.post(f"{BASE}/auth/forgot-pin", json={"email": "test8@example.com"})
    print("Forgot PIN Response:", res.json())

except Exception as e:
    print("Error:", e)
finally:
    server.terminate()
