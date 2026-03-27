# 🍽️ Restaurant Point of Sale (POS) System

A full-stack, production-ready Point of Sale system for cafes and restaurants. Customers scan a QR code at their table to browse the menu, place orders, and pay — all from their mobile browser. Staff manage menus, tables, and orders from an admin panel.

## ✨ Features

### Customer Flow
- 📱 **Scan QR code** at the table → open ordering page in browser
- 🍜 **Browse menu** grouped by category with prices
- 🛒 **Add to cart** with notes per item
- 📝 **Place order** with customer name and notes
- 💳 **Pay online** via QRIS (QR Code) or Virtual Account
- ✅ **Real-time payment status** with auto-polling

### Admin Panel
- 🔐 **Secure login** with JWT authentication
- 📊 **Dashboard** — today's orders, revenue, status breakdown, top items
- 📋 **Menu Management** — create/edit/delete categories and menu items, toggle availability
- 🪑 **Table Management** — add/edit tables, generate & display QR codes
- 📦 **Order Management** — view all orders, filter by status/date, update order status (PREPARING → READY → COMPLETED)

### Payment Gateways
- 💰 **Xendit** — QRIS (dynamic QR), Virtual Account (BCA, BNI, BRI, Mandiri, etc.)
- 💰 **Durianpay** — QRIS, Virtual Account (with checkout URL)
- 🔄 **Webhook handlers** for automatic payment confirmation
- 🔑 Configurable default gateway via environment variable

## 🏗️ Architecture

```
┌─────────────────────────────────┐
│         Frontend (React)        │
│   - Admin Panel (Vite + React)  │
│   - Customer Ordering Portal    │
│   - Tailwind CSS (Orange theme) │
└────────────────┬────────────────┘
                 │ REST API (JSON)
┌────────────────▼────────────────┐
│       Backend (Node.js)         │
│   - Express + TypeScript        │
│   - JWT Authentication          │
│   - Input Validation            │
│   - Prisma ORM (SQLite/Postgres)│
└────────────────┬────────────────┘
                 │
┌────────────────▼────────────────┐
│          SQLite DB              │
│  Admin | Category | MenuItem    │
│  Table | Order | OrderItem      │
│  Payment                        │
└─────────────────────────────────┘
```

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install --legacy-peer-deps

# Configure environment
cp .env.example .env
# Edit .env with your Xendit/Durianpay keys

# Run migrations
npx prisma migrate dev --name init

# Seed with sample data (admin + menu items + tables)
npx ts-node prisma/seed.ts

# Start development server
npm run dev
# → Running at http://localhost:3000
```

**Default admin credentials after seeding:**
- Email: `admin@cafe.com`
- Password: `admin123`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit VITE_API_URL if your backend is not at localhost:3000

# Start development server
npm run dev
# → Running at http://localhost:5173
```

### 3. Access the Application

| URL | Description |
|-----|-------------|
| http://localhost:5173/admin | Admin Panel |
| http://localhost:5173/order/:tableId | Customer Order Page |
| http://localhost:3000/health | Backend Health Check |

## 🐳 Docker

```bash
# Copy and configure environment
cp backend/.env.example .env

# Build and run everything
docker compose up --build

# Access at:
# Admin: http://localhost:5173/admin
# Backend: http://localhost:3000
```

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `DATABASE_URL` | SQLite/PostgreSQL URL | `file:./dev.db` |
| `JWT_SECRET` | JWT signing secret | ⚠️ **Change in production** |
| `JWT_EXPIRES_IN` | Token expiry | `24h` |
| `FRONTEND_URL` | CORS allowed origin | `http://localhost:5173` |
| `XENDIT_SECRET_KEY` | Xendit API key | — |
| `XENDIT_WEBHOOK_TOKEN` | Xendit webhook verification token | — |
| `DURIANPAY_SECRET_KEY` | Durianpay API key | — |
| `DEFAULT_PAYMENT_GATEWAY` | `XENDIT` or `DURIANPAY` | `XENDIT` |
| `QR_BASE_URL` | Public URL for customer QR links | `http://localhost:5173` |

### Frontend (`frontend/.env`)

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend API URL |

## 🧪 Testing

```bash
cd backend

# Run all tests (67 tests)
npm test

# Run only unit tests
npm test -- tests/unit/

# Run only integration tests
npm test -- tests/integration/

# Run with coverage
npm test -- --coverage
```

### Test Coverage
- ✅ Auth API (login, profile, validation)
- ✅ Menu API (categories + items CRUD)
- ✅ Table API (CRUD, QR generation)
- ✅ Order API (place, status transitions, stats, filters)
- ✅ Payment API (create, get, status, webhooks)
- ✅ Payment service unit tests (Xendit + Durianpay)
- ✅ Response utility unit tests

## 📡 API Reference

### Auth
```
POST   /api/auth/login              # Admin login
GET    /api/auth/profile            # Get profile (auth)
PATCH  /api/auth/change-password    # Change password (auth)
```

### Menu (admin endpoints require Bearer token)
```
GET    /api/menu/public             # Public menu (no auth)
GET    /api/menu/items              # List items (no auth)
GET    /api/menu/categories         # List categories (auth)
POST   /api/menu/categories         # Create category (auth)
PATCH  /api/menu/categories/:id     # Update category (auth)
DELETE /api/menu/categories/:id     # Delete category (auth)
GET    /api/menu/items/:id          # Get item (auth)
POST   /api/menu/items              # Create item (auth)
PATCH  /api/menu/items/:id          # Update item (auth)
DELETE /api/menu/items/:id          # Delete item (auth)
```

### Tables
```
GET    /api/tables/:id/public       # Get table info (no auth)
GET    /api/tables                  # List tables (auth)
POST   /api/tables                  # Create table (auth)
PATCH  /api/tables/:id              # Update table (auth)
DELETE /api/tables/:id              # Delete table (auth)
POST   /api/tables/:id/qr          # Regenerate QR (auth)
```

### Orders
```
POST   /api/orders                  # Place order (no auth)
GET    /api/orders/:id              # Get order (no auth)
GET    /api/orders                  # List orders (auth)
GET    /api/orders/stats/today      # Today's stats (auth)
PATCH  /api/orders/:id/status       # Update status (auth)
PATCH  /api/orders/:id/cancel       # Cancel order (auth)
```

### Payments
```
POST   /api/payments/orders/:id     # Create payment (no auth)
GET    /api/payments/orders/:id     # Get payment (no auth)
GET    /api/payments/orders/:id/status  # Check status (no auth)
POST   /api/payments/webhooks/xendit    # Xendit webhook
POST   /api/payments/webhooks/durianpay # Durianpay webhook
```

## 📊 Order Status Flow

```
PENDING → CANCELLED         (customer cancelled)
PENDING → PAID              (via payment webhook or manual)
PAID    → PREPARING         (kitchen starts)
PAID    → CANCELLED         (admin cancelled)
PREPARING → READY           (food ready)
PREPARING → CANCELLED       (kitchen cancelled)
READY   → COMPLETED         (served)
```

## 🏦 Payment Gateway Setup

### Xendit
1. Register at https://dashboard.xendit.co
2. Get your API key from Settings > API Keys
3. Set `XENDIT_SECRET_KEY` in `.env`
4. Configure webhook URL: `https://your-domain/api/payments/webhooks/xendit`
5. Set `XENDIT_WEBHOOK_TOKEN` from the webhook settings

### Durianpay
1. Register at https://dashboard.durianpay.id
2. Get your API key from Settings > Developers
3. Set `DURIANPAY_SECRET_KEY` in `.env`
4. Configure webhook URL: `https://your-domain/api/payments/webhooks/durianpay`

## 🗃️ Database Schema

```
Admin         - id, email, password (bcrypt), name
Category      - id, name, description, sortOrder, isActive
MenuItem      - id, name, description, price, imageUrl, isAvailable, categoryId
Table         - id, number, name, capacity, qrCode, isActive
Order         - id, tableId, customerName, customerNote, status, totalAmount
OrderItem     - id, orderId, menuItemId, quantity, unitPrice, subtotal, notes
Payment       - id, orderId, gateway, method, externalId, status, amount, qrString, paymentUrl
```

## 📦 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express, TypeScript |
| ORM | Prisma 5 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (jsonwebtoken) |
| Validation | express-validator |
| Testing | Jest, ts-jest, supertest |
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS |
| State | Zustand (auth persistence) |
| Data Fetching | TanStack Query |
| Notifications | react-hot-toast |
| Icons | Lucide React |
| Payment | Xendit, Durianpay |
| QR Code | node-qrcode |

## 📝 Assumptions

1. Single restaurant/cafe (not multi-tenant)
2. Prices are in Indonesian Rupiah (IDR)
3. QRIS payments expire in 30 minutes, Virtual Accounts in 24 hours
4. Menu items with existing orders are soft-deleted (marked unavailable) instead of hard-deleted
5. Tables with order history can be deactivated but not deleted
6. SQLite is used for development simplicity; swap `DATABASE_URL` for PostgreSQL in production
