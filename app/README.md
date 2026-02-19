# 🏪 Quick Shop — Virtual Queue & Digital Storefront

A production-ready Python web app for a general store. Customers browse a digital catalog, build a cart, place orders with a unique token, and track pickup status in real-time. Store admins manage orders from a protected dashboard.

## ✨ Features

- **Digital Catalog** — 20 general store products with images, prices, and +/- quantity controls
- **Virtual Cart** — Full cart summary with totals, clear/confirm actions
- **Token System** — Unique order tokens (STORE-101, STORE-102...) for queue management
- **Admin Dashboard** — Password-protected order management with status toggling
- **Real-Time Updates** — Customer status auto-updates when admin marks "Ready for Pickup"
- **Modern UI** — Gradient backgrounds, card shadows, smooth animations, responsive design

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Install & Run

```bash
cd app
pip install -r requirements.txt
python main.py
```

### Access
| Service | URL |
|---------|-----|
| 🖥️ Customer App | http://localhost:8501 |
| 📡 API Server | http://localhost:8000 |
| 📋 API Docs | http://localhost:8000/docs |
| 🔐 Admin Panel | http://localhost:8501/admin |

**Default admin password**: `admin123` (change in `.env`)

## 🐳 Docker

```bash
cd app
docker-compose up --build
```

## 📁 Project Structure

```
app/
├── main.py              # FastAPI app + Flet launcher (entry point)
├── database.py          # SQLite setup, seed data, CRUD
├── models.py            # Pydantic validation models
├── customer.py          # Flet customer views (catalog/cart/confirm/status)
├── admin.py             # Flet admin dashboard
├── websocket.py         # WebSocket connection manager
├── .env                 # Environment config (admin password, secrets)
├── requirements.txt     # Python dependencies
├── Dockerfile           # Container image
├── docker-compose.yml   # Container orchestration
└── README.md            # This file
```

## 🔧 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/orders` | Place new order |
| GET | `/api/orders?password=xxx` | List all orders (admin) |
| GET | `/api/orders/{token}` | Get order by token |
| PATCH | `/api/orders/{token}/status?password=xxx` | Toggle order status (admin) |
| GET | `/health` | Health check |

## 🔐 Security

- Admin password stored in `.env` file
- Rate limiting: 30 requests/minute per IP
- CORS enabled for frontend-backend communication
- Pydantic input validation on all endpoints
- Phone number validation (10-digit Indian format)

## 🛠️ Configuration (.env)

```env
ADMIN_PASSWORD=admin123
SECRET_KEY=your-secret-key
DATABASE_URL=store.db
RATE_LIMIT=30
```

## 📱 Customer Flow

1. **Browse** → Products displayed in responsive grid with images and prices
2. **Add to Cart** → Use +/- buttons (max 10 per item)
3. **Review Cart** → See all items, quantities, subtotals, and total bill
4. **Confirm** → Enter phone number → Get unique token (e.g., STORE-105)
5. **Track** → Status page auto-polls every 5 seconds for updates

## 🏪 Admin Flow

1. **Login** → Enter admin password
2. **Dashboard** → See all orders with stats (total/processing/ready)
3. **Expand** → Click any order to see full item list
4. **Toggle** → Mark orders as "Ready for Pickup"
5. **Auto-Refresh** → New orders appear automatically every 5 seconds
