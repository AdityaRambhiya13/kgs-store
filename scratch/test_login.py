import requests

url = "http://localhost:8000/api/auth/admin-login"
password = "KetanStoreSecure!2026"

try:
    response = requests.post(url, json={"password": password})
    print(f"Status Code: {response.status_code}")
    print(f"Response Body: {response.text}")
except Exception as e:
    print(f"Error: {e}")
