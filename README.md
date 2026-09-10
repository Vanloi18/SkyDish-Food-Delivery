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
7. [Installation & Development Startup](#7-installation--development-startup)
8. [Environment Variables](#8-environment-variables)
9. [Docker & Container Deployment](#9-docker--container-deployment)
10. [Automated Testing & Security Matrix](#10-automated-testing--security-matrix)
11. [Development / Demo Accounts](#11-development--demo-accounts)
12. [Known Limitations & Historical Notes](#12-known-limitations--historical-notes)

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

## 7. Installation & Development Startup

### Prerequisites
- Node.js `v18+` or `v20+` LTS
- npm `v9+`
- MongoDB `v6+` / `v7+` (Local standalone on port `27000` / `27017` or MongoDB Atlas URI)

### Quick Start (Local Node.js)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Vanloi18/SkyDish-Food-Delivery.git
   cd SkyDish-Food-Delivery
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your environment configuration
   ```

3. **Install dependencies**:
   ```bash
   # Root / Runner
   npm install

   # Services
   cd backend/auth-service && npm install && cd ../..
   cd backend/restaurant-service && npm install && cd ../..
   cd backend/order-service && npm install && cd ../..
   cd backend/payment-service && npm install && cd ../..
   cd delivery-service/backend && npm install && cd ../..
   cd frontend && npm install && cd ..
   ```

4. **Start microservices**:
   - Using Windows helper batch scripts:
     ```cmd
     start-all.bat
     ```
   - Or start each microservice independently in separate terminal windows:
     ```bash
     # Auth Service
     cd backend/auth-service && npm start

     # Restaurant Service
     cd backend/restaurant-service && npm start

     # Order Service
     cd backend/order-service && npm start

     # Delivery Service
     cd delivery-service/backend && npm start

     # Payment Service
     cd backend/payment-service && npm start

     # React Frontend
     cd frontend && npm start
     ```

---

## 8. Environment Variables

Create `.env` in the repository root (see `.env.example` for the complete template):

```dotenv
# Database
MONGO_URI=mongodb://127.0.0.1:27000/food_delivery_db

# Microservice Ports
PORT_AUTH=4000
PORT_REST=5002
PORT_ORDER=5005
PORT_DELIVERY=5003
PORT_PAYMENT=5004

# Security
JWT_SECRET=your_strong_jwt_secret_key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
REACT_APP_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# VNPay Sandbox
VNPAY_TMN_CODE=your_vnpay_tmn_code
VNPAY_HASH_SECRET=your_vnpay_hash_secret
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/vnpay/callback

# MoMo Sandbox
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create
MOMO_REDIRECT_URL=http://localhost:3000/payment/momo/callback
MOMO_IPN_URL=http://localhost:5004/api/payment/momo/ipn

# Bank Transfer / VietQR
BANK_TRANSFER_ENABLED=true
BANK_ID=970422
BANK_CODE=MB
BANK_NAME=MB Bank
BANK_ACCOUNT_NUMBER=your_merchant_account_number
BANK_ACCOUNT_NAME=your_merchant_account_name
VIETQR_TEMPLATE=compact2

# Frontend
REACT_APP_BACKEND_URL=http://localhost:4000
```

> **Security Note**: Never commit actual secrets or production credentials to Git. Keep sensitive values strictly in local `.env` files.

---

## 9. Docker & Container Deployment

### Local Docker Compose

Build and launch all 5 microservices, the React frontend, and a containerized MongoDB instance:

```bash
docker compose up --build -d
```

Check running containers:
```bash
docker compose ps
```

Stop containers:
```bash
docker compose down
```

### Kubernetes Manifests

Production-ready YAML specifications are available in `k8s/`:
- `k8s/secrets.yaml`
- `k8s/mongo.yaml`
- `k8s/deployment.yaml`
- `k8s/service.yaml`

---

## 10. Automated Testing & Security Matrix

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

## 11. Development / Demo Accounts

For local development and testing across user roles, the platform supports the following role structures:

- **Customer Role**: Registered via `/auth/register` or created with `role: "customer"`.
- **Restaurant Partner Role**: Registered via `/restaurant/register` or created with `role: "restaurant"`.
- **Shipper / Driver Role**: Registered with `role: "driver"`.
- **Super Admin Role**: Platform-wide administrator with `role: "admin"` or `role: "superAdmin"`.

> *Passwords for development accounts should be configured locally in your development database and not committed to source control.*

---

## 12. Known Limitations & Historical Notes

- **Payment Sandboxes**: VNPay and MoMo integrations run in sandbox/test environments by default. Production deployment requires approved merchant credentials from respective payment providers.
- **MongoDB Transactions**: On MongoDB standalone instances (non-replica set), multi-document ACID transactions gracefully fall back to atomic direct operations in the Order Service. Full replica sets or MongoDB Atlas are recommended for production clustering.
- **Historical COD Pricing Note**: An earlier revision exhibited a known client-side pricing display mismatch during COD payment toggle; the current server-authoritative checkout architecture strictly verifies and enforces all order totals on the backend.

---

## 📄 License & Ownership

SkyDish Food Delivery Platform — Developed by [Vanloi18](https://github.com/Vanloi18). All rights reserved.
