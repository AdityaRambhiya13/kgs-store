import time
import json
from pydantic import BaseModel
from typing import List

class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    mrp: float = 0.0
    description: str
    image_url: str
    category: str
    sub_category: str = ""
    base_name: str = ""
    unit: str = "kg"
    is_visible: bool = True
    in_stock: bool = True
    is_newly_launched: bool = False
    display_order: int = 0

items = [{
    'id': i,
    'name': 'Product ' + str(i),
    'price': 10.0,
    'mrp': 12.0,
    'description': 'desc',
    'image_url': 'http://img.com',
    'category': 'cat',
    'sub_category': 'sub',
    'base_name': 'base',
    'unit': 'kg',
    'is_visible': True,
    'in_stock': True,
    'is_newly_launched': False,
    'display_order': 0
} for i in range(4070)]

# Test 1: Pydantic parsing
t0 = time.time()
validated = [ProductOut(**item).dict() for item in items]
t1 = time.time()
print(f"Pydantic validation time: {t1 - t0:.3f}s")

# Test 2: Standard JSON serialization
t0 = time.time()
serialized = json.dumps(items)
t1 = time.time()
print(f"JSON serialization time: {t1 - t0:.3f}s")
