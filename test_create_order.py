import sys
import os

# Set ENV VAR
os.environ["DATABASE_URL"] = "postgresql://postgres.iezqlltomqrdkgogdgqu:PilImEP1jI5Qmx0m@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

# Import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
import database

try:
    print("Testing create_order...")
    token = database.create_order(
        phone="9999999999",
        items=[{"product_id": 1, "quantity": 1}],
        total=100.0,
        delivery_type="pickup",
        delivery_time="same_day",
        address="Test"
    )
    print("Success! Token:", token)
except Exception as e:
    import traceback
    traceback.print_exc()

