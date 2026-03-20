import sys
import traceback

sys.path.append('.')

from app.database import init_db

try:
    init_db()
    print("DB OK")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
    traceback.print_exc()
