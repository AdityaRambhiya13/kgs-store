
import requests
import json

BASE_URL = "http://localhost:8000"

def test_reset_flow():
    phone = "9987502271"
    print(f"Testing Forgot PIN for {phone}...")
    res = requests.post(f"{BASE_URL}/api/auth/forgot-pin", json={"phone": phone})
    print(f"Forgot PIN Response: {res.status_code} - {res.text}")
    
    if res.status_code == 200:
        data = res.json()
        token = data['token']
        print(f"Token received: {token[:10]}...")
        
        print("\nTesting Reset PIN...")
        res2 = requests.post(f"{BASE_URL}/api/auth/reset-pin", json={
            "token": token,
            "new_pin": "1111"
        })
        print(f"Reset PIN Response: {res2.status_code} - {res2.text}")

if __name__ == "__main__":
    test_reset_flow()
