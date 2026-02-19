# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
A production-ready Python web app for a general store "Virtual Queue & Digital Storefront" — enabling customers to browse a digital catalog, build a cart, place orders with a unique token, and track pickup status in real-time. Store admins manage orders from a protected dashboard.

## Goals
1. Customer-facing digital catalog with 20 general store products, intuitive quantity controls, and virtual cart
2. Token-based order system (format "STORE-###") with phone number verification
3. Admin dashboard with order management and status toggling (Processing → Ready for Pickup)
4. Real-time status updates between customer and admin views
5. Modern, trendy UI with dark mode, glassmorphism, gradients, and smooth animations
6. Production-ready with Docker support, security (bcrypt, rate limiting, CORS), and input validation

## Non-Goals (Out of Scope)
- Payment gateway integration
- User accounts / login for customers
- Inventory management / stock tracking
- Multi-store support
- Push notifications (SMS/email)
- External database (PostgreSQL, MySQL) — SQLite only

## Users
- **Customers**: Walk-in general store customers who browse products, build a cart, and place orders via their phone/browser
- **Store Admin**: Store owner/staff who views incoming orders, manages status, and signals pickup readiness

## Constraints
- **Tech Stack**: Python only — FastAPI (backend), Flet (frontend), SQLite (database)
- **Deployment**: Docker-ready, single `python main.py` to start
- **Security**: bcrypt password hashing, rate limiting (10 req/min), CORS, Pydantic validation
- **UI**: Modern design with Inter font, dark mode, glassmorphism, gradient backgrounds (#1E3A8A blue, #10B981 green)

## Success Criteria
- [ ] 20 products displayed in responsive grid with images and prices
- [ ] Cart workflow: add items → review cart → confirm with phone → receive token
- [ ] Admin dashboard shows all orders with status toggle
- [ ] Real-time: customer sees "Ready for Pickup" within 5 seconds of admin toggle
- [ ] App starts with single command and is fully functional out-of-box
- [ ] Docker build and run works without issues
