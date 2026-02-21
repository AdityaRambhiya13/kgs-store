# ============================================================
# models.py — Pydantic Models for Validation
# ============================================================
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
import re
import html

def sanitize_text(v: str) -> str:
    if not isinstance(v, str): return v
    # Strip HTML tags
    v = re.sub(r'<[^>]*>', '', v)
    # Escape characters
    return html.escape(v.strip())


class CartItem(BaseModel):
    """Single item in the cart."""
    product_id: int = Field(..., gt=0, description="Product ID")
    name: str = Field(..., min_length=1, max_length=100, description="Product name")
    price: float = Field(..., gt=0)
    quantity: int = Field(..., ge=1, le=100, description="Quantity in kg (1-100)")

    @field_validator("name")
    @classmethod
    def sanitize_name(cls, v):
        return sanitize_text(v)


class OrderCreate(BaseModel):
    """Request body for creating an order."""
    phone: str = Field(..., description="10-digit Indian phone number")
    items: List[CartItem] = Field(..., min_length=1, description="Cart items")
    total: float = Field(..., gt=0, description="Total bill amount")
    delivery_type: Literal["pickup", "delivery"] = "pickup"
    address: Optional[str] = Field(None, max_length=500, description="Delivery address if delivery_type is delivery")

    @field_validator("address")
    @classmethod
    def validate_address(cls, v):
        if v is not None:
            return sanitize_text(v)
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Please enter a valid 10-digit Indian phone number")
        return cleaned


class OrderOut(BaseModel):
    """Response model for an order."""
    id: int
    token: str
    phone: str
    items_json: str
    status: str
    total: float
    timestamp: str
    delivery_type: str = "pickup"
    address: Optional[str] = None
    delivery_otp: Optional[str] = None
    delivered_at: Optional[str] = None

class OrderStatusUpdate(BaseModel):
    """Request body for updating order status."""
    status: str = Field(..., pattern=r"^(Processing|Ready for Pickup|Delivered)$")
    otp: Optional[str] = Field(None, min_length=4, max_length=4, pattern=r"^\d{4}$", description="4-digit OTP required for home delivery")

    @field_validator("status", "otp")
    @classmethod
    def sanitize_inputs(cls, v):
        if v is not None:
            return sanitize_text(v)
        return v


class ProductOut(BaseModel):
    """Response model for a product."""
    id: int
    name: str
    price: float
    description: str
    image_url: str
    category: str
    base_name: str = ""


class CustomerAuth(BaseModel):
    """Phone + PIN for customer authentication."""
    phone: str = Field(..., description="10-digit Indian phone number")
    pin: str = Field(..., min_length=4, max_length=4, pattern=r"^\d{4}$",
                     description="4-digit numeric PIN")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        cleaned = re.sub(r"[\s\-\+]", "", v)
        if cleaned.startswith("91") and len(cleaned) == 12:
            cleaned = cleaned[2:]
        if not re.match(r"^[6-9]\d{9}$", cleaned):
            raise ValueError("Please enter a valid 10-digit Indian phone number")
        return cleaned


class CustomerOut(BaseModel):
    """Response model for a customer."""
    phone: str
    created_at: str
