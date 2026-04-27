import requests
import os
from dotenv import load_dotenv

load_dotenv("app/.env")
password = "KetanStoreSecure!2026"

def test_mapper_data():
    base_url = "http://localhost:8000" # Assume it's running locally
    
    # 1. Login
    print("Logging in...")
    login_res = requests.post(f"{base_url}/api/auth/admin-login", json={"password": password})
    if login_res.status_code != 200:
        print(f"Login failed: {login_res.status_code} - {login_res.text}")
        return
    
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get Products
    print("Fetching products...")
    p_res = requests.get(f"{base_url}/api/products")
    print(f"Products status: {p_res.status_code}")
    if p_res.status_code == 200:
        print(f"Found {len(p_res.json())} products.")
    
    # 3. Get Images
    print("Fetching available images...")
    i_res = requests.get(f"{base_url}/api/admin/available-images", headers=headers)
    print(f"Images status: {i_res.status_code}")
    if i_res.status_code == 200:
        images = i_res.json().get("images", [])
        print(f"Found {len(images)} images.")
    else:
        print(f"Error: {i_res.text}")

if __name__ == "__main__":
    test_mapper_data()
