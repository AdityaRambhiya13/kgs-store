# ============================================================
# models.py — Pydantic Models for Validation
# ============================================================
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
import re
import html

def sanitize_text(v: str) -> str:
    if not isinstance(v, str): return v
    v = re.sub(r'<[^>]*>', '', v)
    return html.escape(v.strip())

class CartItem(BaseModel):
    product_id: int = Field(..., gt=0)
    name: str = Field(..., min_length=1, max_length=100)
    price: float = Field(..., gt=0)
    quantity: int = Field(..., ge=1, le=100)

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        return sanitize_text(v)

class AddressDetail(BaseModel):
    flat_no: str = Field(..., min_length=1, max_length=100)
    building_name: str = Field(..., min_length=1, max_length=100)
    road_name: str = Field(..., min_length=1, max_length=100)
    area_name: str = Field(..., min_length=1, max_length=100)
    landmark: Optional[str] = Field(None, max_length=100)
    pincode: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")

class OrderCreate(BaseModel):
    items: List[CartItem] = Field(..., min_length=1)
    total: float = Field(..., gt=0)
    delivery_type: Literal["pickup", "delivery"] = "pickup"
    address: Optional[AddressDetail] = None
    save_as_home: bool = False

class OrderOut(BaseModel):
    id: int
    token: str
    phone: str
    customer_name: Optional[str] = None
    items_json: str
    status: str
    total: float
    timestamp: str
    delivery_type: str = "pickup"
    address: Optional[str] = None
    delivery_otp: Optional[str] = None
    delivered_at: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(Processing|Ready for Pickup|Delivered|Cancelled)$")
    otp: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r"^\d{4}$")

    @field_validator("status", "otp")
    @classmethod
    def sanitize_inputs(cls, v):
        return sanitize_text(v) if v else v

class ProductOut(BaseModel):
    id: int
    name: str
    price: float
    description: str
    image_url: str
    category: str
    base_name: str = ""

class OTPRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Invalid Indian phone number")
        return cleaned

class OTPVerifyRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number")
    otp: Optional[str] = Field(None, min_length=4, max_length=6)
    name: Optional[str] = Field(None, max_length=100)
    address: Optional[str] = Field(None, max_length=500)
    firebase_token: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Invalid Indian phone number")
        return cleaned
        
    @field_validator("name", "address")
    @classmethod
    def sanitize_inputs(cls, v):
        return sanitize_text(v) if v else v

class CustomerOut(BaseModel):
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    created_at: str

class SignupRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    phone: str = Field(..., description="10-digit Indian phone number")
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$", description="4-digit security PIN")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Invalid Indian phone number")
        return cleaned

    @field_validator("name")
    @classmethod
    def sanitize_inputs(cls, v):
        return sanitize_text(v) if v else v

class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Phone number or Email")
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$", description="4-digit security PIN")

    @field_validator("identifier")
    @classmethod
    def validate_identifier(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
            return cleaned
        return v.strip().lower()

class ForgotPinRequest(BaseModel):
    phone: str = Field(..., description="10-digit Indian phone number")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Invalid Indian phone number")
        return cleaned

class ResetPinRequest(BaseModel):
    token: str = Field(...)
    new_pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$")

