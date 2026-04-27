import requests

BASE_URL = "http://localhost:8000"

def test_check_phone(phone):
    try:
        resp = requests.get(f"{BASE_URL}/api/auth/check-phone", params={"phone": phone})
        print(f"Check Phone '{phone}': {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"Error checking phone '{phone}': {e}")

def test_login(identifier, pin):
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/login", json={"identifier": identifier, "pin": pin})
        print(f"Login '{identifier}': {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"Error logging in '{identifier}': {e}")

def test_forgot_pin(phone):
    try:
        resp = requests.post(f"{BASE_URL}/api/auth/forgot-pin", json={"phone": phone})
        print(f"Forgot PIN '{phone}': {resp.status_code} - {resp.json()}")
    except Exception as e:
        print(f"Error forgot pin '{phone}': {e}")

if __name__ == "__main__":
    # Test with a known phone from the database
    known_phone = "9987502271"
    
    print("Testing API endpoints...")
    test_check_phone(known_phone)
    test_check_phone(f"+91{known_phone}")
    
    test_forgot_pin(known_phone)
    test_forgot_pin(f"+91{known_phone}")
    
    # We don't know the PIN, but we should get "Incorrect PIN" if user is found
    # or "User not found" if cleaning is broken.
    test_login(known_phone, "0000")
    test_login(f"+91{known_phone}", "0000")
