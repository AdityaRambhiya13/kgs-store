import os
from dotenv import load_dotenv

env_path = os.path.join("app", ".env")
load_dotenv(env_path)

admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
print(f"ADMIN_PASSWORD: '{admin_password}'")
print(f"Length: {len(admin_password)}")
