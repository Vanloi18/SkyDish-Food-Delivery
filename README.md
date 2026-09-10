# SkyDish — Food Delivery Platform

A Vietnamese food delivery platform built with a microservices architecture.

---

## 📑 Table of Contents

1. [Features](#1-features)
2. [Architecture & Roles](#2-architecture--roles)
3. [Microservices & Service Ports](#3-microservices--service-ports)
4. [Authentication & Authorization (JWT / RBAC)](#4-authentication--authorization-jwt--rbac)
5. [Multi-Channel Payment Gateways](#5-multi-channel-payment-gateways)
6. [Real-Time & Engagement Features](#6-real-time--engagement-features)
7. [Quick Start with Docker](#7-quick-start-with-docker-recommended---one-command)
8. [Development & Demo Credentials](#8-development--demo-credentials)
9. [Microservices Port & Endpoint Map](#9-microservices-port--endpoint-map)
10. [Common Docker Operations](#10-common-docker-operations--cheat-sheet)
11. [Troubleshooting Guide](#11-troubleshooting-guide)
12. [Local Host Development](#12-local-host-development-without-docker)
13. [Automated Testing & Security Matrix](#13-automated-testing--security-matrix)
14. [Known Limitations & Historical Notes](#14-known-limitations--historical-notes)

---

## 1. Features

- **Multi-Role Platform**: Unified food ordering ecosystem serving Customers, Restaurant Partners, Shippers (Delivery Personnel), and Super Admins.
- **Microservices Architecture**: Independently deployable backend services with clear bounded contexts (Auth, Restaurant, Order, Payment, Delivery).
- **Vietnam-Optimized Payments**: Native integration for VNPay, MoMo QR/Gateway, VietQR (MB Bank direct scan), Stripe Cards, and Cash on Delivery (COD).
- **Authoritative Server-Side Pricing**: Zero client-side trust; food prices, discounts, delivery fees, and total calculations are strictly computed and verified on the server.
- **Cross-User Data Protection (RBAC)**: Strict query scoping and 403 Forbidden enforcement prevent any horizontal privilege escalation or data leakage between customers and stores.
- **Dynamic Coupon & Voucher Engine**: Configurable minimum order values, percentage and flat discounts, expiration dates, and real-time validation.
- **Fuzzy Search & Catalog Browsing**: Regex-safe search, category filtering, and paginated menu browsing for restaurants and food items.
- **Interactive Ratings & Reviews**: Post-order feedback and ratings mechanism for restaurants and dishes.
- **Real-Time Updates with Socket.IO**: Live order lifecycle progression and delivery tracking notifications.

---

## 2. Architecture & Roles

### 2.1 Architecture Diagram

```
                 Customer   •   Restaurant Partner   •   Shipper   •   Super Admin
                                           │
                                           ▼
                                 ┌───────────────────┐
                                 │  React Frontend   │
                                 │    (Port 3000)    │
                                 └─────────┬─────────┘
                                           │  REST / Socket.IO
                                           ▼
       ┌───────────────────────────────────┬───────────────────────────────────┐
       ▼                                   ▼                                   ▼
┌──────────────┐                  ┌──────────────────┐                  ┌──────────────┐
│ Auth Service │                  │Restaurant Service│                  │Order Service │
│  Port 4000   │                  │    Port 5002     │                  │  Port 5005   │
└──────┬───────┘                  └────────┬─────────┘                  └──────┬───────┘
       │                                   │                                   │
       └───────────────────────────────────┼───────────────────────────────────┘
                                           ▼
       ┌───────────────────────────────────┴───────────────────────────────────┐
       ▼                                                                       ▼
┌──────────────┐                                                        ┌──────────────┐
│Delivery Svc  │                                                        │Payment Svc   │
│  Port 5003   │                                                        │  Port 5004   │
└──────┬───────┘                                                        └──────┬───────┘
       │                                                                       │
       └───────────────────────────────────┬───────────────────────────────────┘
                                           │
                                           ▼
                                ┌─────────────────────┐
                                │  MongoDB Database   │
                                │ (food_delivery_db)  │
                                └─────────────────────┘
                                           ▲
                                           │
                               ┌───────────────────────┐
                               │ Socket.IO Event Plane │
                               └───────────────────────┘
```

### 2.2 System Roles & Permissions

| Role | Portal / Path | Key Capabilities |
| :--- | :--- | :--- |
| **Customer** | `/`, `/customer/home`, `/checkout` | Browse restaurants, add items to cart, apply coupons, select payment methods, track orders, leave reviews. |
| **Restaurant Partner** | `/restaurant/login`, `/restaurant/dashboard` | Manage restaurant profile, create/update/delete menu items, manage voucher codes, inspect restaurant-specific orders. |
| **Shipper (Driver)** | `/driver/login`, `/driver/orders` | View pending deliveries, accept assignments, update delivery milestones (`Picked-up`, `Delivered`), share live location. |
| **Super Admin** | `/admin/super-login`, `/admin/dashboard` | Platform-wide oversight, cross-service auditing, manage all registered restaurants, users, deliveries, and system analytics. |

---

## 3. Microservices & Service Ports

| Service | Port | Directory | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Auth Service** | `4000` | `backend/auth-service/` | Customer & Admin registration/login, password hashing (bcrypt), JWT token minting & validation. |
| **Restaurant Service** | `5002` | `backend/restaurant-service/` | Restaurant management, menu item CRUD, fuzzy search, categories, coupon voucher engine, reviews, notifications. |
| **Order Service** | `5005` | `backend/order-service/` | Authoritative pricing calculation, transactional order creation, status state machine, customer order history. |
| **Delivery Service** | `5003` | `delivery-service/backend/` | Driver assignment, delivery dispatching, status lifecycle transitions, real-time driver coordinates. |
| **Payment Service** | `5004` | `backend/payment-service/` | Payment gateway abstraction (VNPay, MoMo, VietQR, Stripe, COD), webhook handlers, Swagger documentation (`/api-docs`). |
| **Frontend Web App** | `3000` | `frontend/` | Responsive single-page application built with React 18, React Router v6, Tailwind CSS & modern design tokens. |

---

## 4. Authentication & Authorization (JWT / RBAC)

- **Token Structure**: JSON Web Tokens signed with server-side `JWT_SECRET` containing user context:
  ```json
  {
    "id": "6507f1f77b...",
    "role": "customer" | "restaurant" | "driver" | "admin" | "superAdmin",
    "email": "user@skydish.com",
    "name": "User Name"
  }
  ```
- **Server Authority**:
  - `customerId` is NEVER trusted from client payloads. It is extracted exclusively from the decoded JWT.
  - Price tampering prevention: submitted prices in checkout payloads are discarded; verified prices are retrieved from MongoDB `FoodItem` records.
- **Horizontal Access Control**:
  - Customer B cannot view, modify, or cancel orders belonging to Customer A (enforced with `403 Forbidden`).
  - Admins retain audited platform-wide read access.

---

## 5. Multi-Channel Payment Gateways

SkyDish provides 5 payment methods tailored for the Vietnamese and international e-commerce landscape:

1. **VNPay (Vietnam)**:
   - Official URL creation with HMAC-SHA512 checksum signature.
   - Return URL callback verification for seamless transaction completion.
2. **MoMo (Vietnam)**:
   - Official API v2 integration (`captureWallet`) with HMAC-SHA256 digital signatures.
   - Secure IPN (Instant Payment Notification) server-to-server webhook callback.
3. **Bank Transfer / VietQR**:
   - Official VietQR standard quick links (`https://img.vietqr.io/image/...`).
   - Dynamic transfer content embedding (`SKYDISH-<orderId>`) for merchant reconciliation.
4. **Stripe (Cards)**:
   - Stripe Elements SDK integration with secure `PaymentIntent` lifecycle and webhook event handling.
5. **Cash on Delivery (COD)**:
   - Immediate order confirmation with deferred payment status recorded as `Pending`.

---

## 6. Real-Time & Engagement Features

- **Socket.IO Event Bus**:
  - `orderStatusUpdate`: Emitted when orders transition between `Pending`, `Confirmed`, `Preparing`, `Out for Delivery`, `Delivered`, `Cancelled`.
  - `location-update`: Broadcasts driver coordinates to customer tracking map.
- **Coupons & Promotions**:
  - Dynamic coupon validation checking minimum basket amount, percentage or fixed discount, and expiration date.
- **Reviews & Ratings**:
  - Verified customers can rate and review dishes and restaurants after delivery.
- **Notification Pipeline**:
  - Centralized notification service supporting in-app alerts, optional Twilio SMS notifications, and Resend email confirmations.

---

## 7. Quick Start with Docker (Recommended - One Command)

Get the complete SkyDish platform up and running in **under 2 minutes** on any clean computer with only **Docker Desktop** and **Git** installed. No Node.js, npm, or MongoDB host installations required!

### Windows PowerShell

```powershell
# 1. Clone repository
git clone https://github.com/Vanloi18/SkyDish-Food-Delivery.git
cd SkyDish-Food-Delivery

# 2. Create environment configuration from template
Copy-Item .env.example .env

# 3. Build & start all services in the background
docker compose up -d --build

# 4. Open browser
Start-Process "http://localhost:3000"
```

### macOS / Linux (bash / zsh)

```bash
# 1. Clone repository
git clone https://github.com/Vanloi18/SkyDish-Food-Delivery.git
cd SkyDish-Food-Delivery

# 2. Create environment configuration from template
cp .env.example .env

# 3. Build & start all services in the background
docker compose up -d --build

# 4. Open browser
open http://localhost:3000   # macOS
# xdg-open http://localhost:3000  # Linux
```

> **Automatic Database Seeding**: On the initial startup with an empty database, `restaurant-service` automatically seeds demo accounts (Super Admin, Customer, Shipper), 5 authentic Vietnamese restaurants with menus and food items, and 4 discount coupons.

---

## 8. Development & Demo Credentials

All demo accounts are pre-seeded and ready to use immediately:

| Role | Email | Password | Access Portal / URL | Features Available |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@skydish.com` | `password123` | `http://localhost:3000/admin/super-login` | Platform analytics, restaurant approvals, driver status, cross-service logs. |
| **Customer** | `customer@skydish.com` | `password123` | `http://localhost:3000/auth/login` | Browse restaurants, add to cart, apply vouchers, checkout via COD/VietQR/MoMo/VNPay/Stripe, track orders. |
| **Shipper / Driver** | `driver@skydish.com` | `password123` | `http://localhost:3000/driver/login` | View dispatched deliveries, update order status (`Picked-up`, `Delivered`), GPS simulation. |
| **Restaurant Partner** | `trangtien@pizza4ps.com` | `password123` | `http://localhost:3000/restaurant/login` | Menu CRUD, dish pricing, inventory availability, coupon management, restaurant reviews. |

---

## 9. Microservices Port & Endpoint Map

All backend services listen on `0.0.0.0` and are exposed to the host machine:

| Container Name | Service | Internal Port | Host Port | Health Check / Direct URL |
| :--- | :--- | :--- | :--- | :--- |
| `skydish-frontend` | React Frontend (Nginx) | `3000` | `3000` | [http://localhost:3000](http://localhost:3000) |
| `skydish-auth-service` | Auth Microservice | `4000` | `4000` | [http://localhost:4000/health](http://localhost:4000/health) |
| `skydish-restaurant-service` | Restaurant Microservice | `5002` | `5002` | [http://localhost:5002/health](http://localhost:5002/health) |
| `skydish-delivery-service` | Delivery Microservice | `5003` | `5003` | [http://localhost:5003/health](http://localhost:5003/health) |
| `skydish-payment-service` | Payment Microservice | `5004` | `5004` | [http://localhost:5004/health](http://localhost:5004/health) |
| `skydish-order-service` | Order Microservice | `5005` | `5005` | [http://localhost:5005/health](http://localhost:5005/health) |
| `skydish-mongo` | MongoDB 7.0 Engine | `27017` | `27017` | `mongodb://localhost:27017/food_delivery_db` |

---

## 10. Common Docker Operations & Cheat Sheet

```bash
# View container status and health
docker compose ps

# Follow logs from all services
docker compose logs -f

# Follow logs from a specific microservice
docker compose logs -f restaurant-service
docker compose logs -f payment-service

# Re-run database seeding at any time
docker compose exec restaurant-service node seed-all.mjs

# Restart an individual service
docker compose restart payment-service

# Stop all containers (preserves database data in mongo-data volume)
docker compose down

# Stop and wipe database volume for a clean state
docker compose down -v
```

---

## 11. Troubleshooting Guide

### Port Already in Use (EADDRINUSE)
If a port (e.g. `3000`, `4000`, `5002`, `27017`) is already occupied on your host machine:
- Windows PowerShell:
  ```powershell
  Get-NetTCPConnection -LocalPort 3000,4000,5002,5003,5004,5005,27017 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
  ```
- macOS / Linux:
  ```bash
  lsof -i :3000 -i :4000 -i :5002 -i :5003 -i :5004 -i :5005 -i :27017
  ```
- Alternatively, override port mappings in your `.env` file (e.g. `FRONTEND_PORT=3001`, `AUTH_PORT=4001`).

### Docker Desktop Not Running
Ensure Docker Desktop is launched and the Docker engine is running before executing `docker compose up`.

### Re-seeding the Database
To reset the database and re-seed from scratch:
```bash
docker compose down -v
docker compose up -d
```

---

## 12. Local Host Development (Without Docker)

If you prefer running services directly on your host machine with Node.js and local MongoDB:

1. **Install dependencies**:
   ```bash
   npm install
   cd backend/auth-service && npm install && cd ../..
   cd backend/restaurant-service && npm install && cd ../..
   cd backend/order-service && npm install && cd ../..
   cd backend/payment-service && npm install && cd ../..
   cd delivery-service/backend && npm install && cd ../..
   cd frontend && npm install && cd ..
   ```

2. **Configure `.env`**:
   Set `MONGO_URI=mongodb://127.0.0.1:27017/food_delivery_db` in `.env`.

3. **Start services**:
   ```cmd
   start-all.bat
   ```

### Kubernetes Manifests

Production-ready YAML specifications are available in `k8s/`:
- `k8s/secrets.yaml`
- `k8s/mongo.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`

---

## 13. Automated Testing & Security Matrix

The project includes an 18-point automated security and data integrity matrix along with comprehensive microservice test suites.

### Running Test Suites

```bash
# 1. 18-Point Security & Business Integrity Matrix
node test-security-matrix.mjs

# 2. Auth Service Unit & Integration Tests (4 tests)
cd backend/auth-service && npm test

# 3. Restaurant Service Tests (5 tests)
cd backend/restaurant-service && npm test

# 4. Order Service Architecture & RBAC Tests (10 tests)
cd backend/order-service && npm test

# 5. Delivery Service Lifecycle Tests (4 tests)
cd delivery-service/backend && npm test

# 6. Payment Service Multi-Gateway Tests (6 tests)
cd backend/payment-service && npm test

# 7. Frontend Production Build
cd frontend && npm run build
```

**Total Verified Tests**: 47/47 passing tests across security, ownership, validation, and multi-gateway payment execution.

---

## 14. Known Limitations & Historical Notes

- **Payment Sandboxes**: VNPay and MoMo integrations run in sandbox/test environments by default. Production deployment requires approved merchant credentials from respective payment providers.
- **MongoDB Transactions**: On MongoDB standalone instances (non-replica set), multi-document ACID transactions gracefully fall back to atomic direct operations in the Order Service. Full replica sets or MongoDB Atlas are recommended for production clustering.
- **Historical COD Pricing Note**: An earlier revision exhibited a known client-side pricing display mismatch during COD payment toggle; the current server-authoritative checkout architecture strictly verifies and enforces all order totals on the backend.

---

## 📄 License & Ownership

SkyDish Food Delivery Platform — Developed by [Vanloi18](https://github.com/Vanloi18). All rights reserved.
