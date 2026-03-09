import sys
import os

os.environ["DATABASE_URL"] = "postgresql://postgres.iezqlltomqrdkgogdgqu:Ketan!RC365365@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
import main
from fastapi.testclient import TestClient

client = TestClient(main.app)

response = client.post("/api/auth/forgot-pin", json={"phone": "+919999999999"})
print("Status Code:", response.status_code)
print("Response JSON:", response.json())
