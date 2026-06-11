import sys
import os
from dotenv import load_dotenv

# Load env variables before importing anything
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "app", ".env")
load_dotenv(env_path)

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app')))

import main
from fastapi.testclient import TestClient
from database import init_db, get_connection, release_connection

def run_tests():
    init_db()
    
    test_phone = "9777777777"
    
    # Clean up test user for idempotency
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM customers WHERE phone = %s", (test_phone,))
        conn.commit()
    finally:
        release_connection(conn)
        
    client = TestClient(main.app)
    print("\n--- Starting Security Questions Integration Tests ---\n")
    
    test_name = "Security Quest User"
    test_pin = "4444"
    test_question = "What was the name of your first school?"
    test_answer = "Greenwood High"
    
    # 1. Sign up with security question and answer
    print("[*] Registering customer with security question...")
    signup_res = client.post("/api/auth/signup", json={
        "name": test_name,
        "phone": test_phone,
        "pin": test_pin,
        "security_question": test_question,
        "security_answer": test_answer
    })
    print(f"    Signup status: {signup_res.status_code}")
    # If already exists, we will delete or just proceed (since existing columns are modified)
    
    # Let's fetch the question
    print("\n[*] Querying security question for registered phone...")
    q_res = client.post("/api/auth/forgot-pin/question", json={
        "phone": test_phone
    })
    print(f"    Get Question status: {q_res.status_code}")
    print(f"    Get Question response: {q_res.json()}")
    assert q_res.status_code == 200, f"Expected 200, got {q_res.status_code}"
    assert q_res.json().get("security_question") == test_question
    
    # 2. Verify with INCORRECT answer
    print("\n[*] Verifying with INCORRECT security answer (Should fail)...")
    verify_fail = client.post("/api/auth/forgot-pin/verify", json={
        "phone": test_phone,
        "security_answer": "Wrong Answer"
    })
    print(f"    Verify status: {verify_fail.status_code}")
    print(f"    Verify response: {verify_fail.json()}")
    assert verify_fail.status_code == 401, f"Expected 401, got {verify_fail.status_code}"
    
    # 3. Verify with CORRECT answer (testing case-insensitivity: 'greenwood high')
    print("\n[*] Verifying with CORRECT security answer (case-insensitive 'greenwood high') (Should succeed)...")
    verify_success = client.post("/api/auth/forgot-pin/verify", json={
        "phone": test_phone,
        "security_answer": "greenwood high"
    })
    print(f"    Verify status: {verify_success.status_code}")
    print(f"    Verify response: {verify_success.json()}")
    assert verify_success.status_code == 200, f"Expected 200, got {verify_success.status_code}"
    
    token = verify_success.json().get("token")
    assert token is not None, "Expected reset token in response"
    
    # 4. Reset PIN with token
    new_pin = "8888"
    print(f"\n[*] Resetting PIN to {new_pin} using token...")
    reset_res = client.post("/api/auth/reset-pin", json={
        "token": token,
        "new_pin": new_pin
    })
    print(f"    Reset PIN status: {reset_res.status_code}")
    print(f"    Reset PIN response: {reset_res.json()}")
    assert reset_res.status_code == 200, f"Expected 200, got {reset_res.status_code}"
    
    # 5. Verify login with the new PIN
    print("\n[*] Logging in with the NEW PIN...")
    login_res = client.post("/api/auth/login", json={
        "identifier": test_phone,
        "pin": new_pin
    })
    print(f"    Login status: {login_res.status_code}")
    assert login_res.status_code == 200, f"Expected 200, got {login_res.status_code}"
    
    # 6. Verify has_security_question is True in /api/auth/me
    customer_token = login_res.json().get("access_token")
    headers = {"Authorization": f"Bearer {customer_token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    print(f"\n[*] /api/auth/me response: {me_res.json()}")
    assert me_res.status_code == 200
    assert me_res.json().get("has_security_question") is True
    
    # 7. Update profile (name, new security question & answer)
    new_question = "In which city were you born?"
    new_answer = "Mumbai"
    print("\n[*] Updating profile with new name and security question...")
    profile_update_res = client.patch("/api/auth/profile", json={
        "name": "Updated Name",
        "security_question": new_question,
        "security_answer": new_answer
    }, headers=headers)
    print(f"    Profile update status: {profile_update_res.status_code}")
    print(f"    Profile update response: {profile_update_res.json()}")
    assert profile_update_res.status_code == 200
    
    # 8. Verify the updated security question can be fetched and answered
    print("\n[*] Querying security question after profile update...")
    q_res2 = client.post("/api/auth/forgot-pin/question", json={"phone": test_phone})
    print(f"    Get Question response: {q_res2.json()}")
    assert q_res2.json().get("security_question") == new_question
    
    print("\n[*] Verifying with new security answer...")
    verify_success2 = client.post("/api/auth/forgot-pin/verify", json={
        "phone": test_phone,
        "security_answer": "mumbai" # test normalization (lowercased)
    })
    print(f"    Verify response: {verify_success2.json()}")
    assert verify_success2.status_code == 200
    
    # 9. Admin Login
    print("\n[*] Logging in as Admin...")
    admin_login_res = client.post("/api/auth/admin-login", json={"password": "KetanStoreSecure!2026"})
    print(f"    Admin login status: {admin_login_res.status_code}")
    assert admin_login_res.status_code == 200
    admin_token = admin_login_res.json().get("access_token")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 10. Admin Reset Customer PIN to '0000'
    temp_pin = "0000"
    print(f"\n[*] Admin resetting customer PIN to '{temp_pin}'...")
    admin_reset_res = client.post(f"/api/admin/customers/{test_phone}/reset-pin", json={
        "new_pin": temp_pin
    }, headers=admin_headers)
    print(f"    Admin reset status: {admin_reset_res.status_code}")
    print(f"    Admin reset response: {admin_reset_res.json()}")
    assert admin_reset_res.status_code == 200
    
    # 11. Customer logs in using temp PIN
    print(f"\n[*] Customer logging in with temporary PIN '{temp_pin}'...")
    temp_login_res = client.post("/api/auth/login", json={
        "identifier": test_phone,
        "pin": temp_pin
    })
    print(f"    Temp login status: {temp_login_res.status_code}")
    assert temp_login_res.status_code == 200
    
    print("\n=== ALL SECURITY QUESTION TESTS PASSED SUCCESSFULLY! ===\n")

if __name__ == "__main__":
    run_tests()
