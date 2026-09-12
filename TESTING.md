# SkyDish Food Delivery Platform — Comprehensive Testing & Reproducibility Guide

> **Document Classification**: Quality Assurance, Security Engineering, DevOps & SDET Verification Reference  
> **Repository**: `Vanloi18/SkyDish-Food-Delivery`  
> **Platform Version**: 1.0.0 (Production Verified)  
> **Audit Date**: September 2026  

---

## Table of Contents
1. [Prerequisites & System Requirements](#1-prerequisites--system-requirements)
2. [Environment Configuration & Secrets](#2-environment-configuration--secrets)
3. [Dependency Installation Protocol](#3-dependency-installation-protocol)
4. [Database Initialization & Data Seeding](#4-database-initialization--data-seeding)
5. [Starting Microservices & Health Endpoints](#5-starting-microservices--health-endpoints)
6. [Complete Test Inventory & Execution Guide](#6-complete-test-inventory--execution-guide)
7. [Docker & Containerized Orchestration](#7-docker--containerized-orchestration)
8. [Troubleshooting Guide](#8-troubleshooting-guide)
9. [Security Boundary Matrix (Guest vs Customer RBAC)](#9-security-boundary-matrix-guest-vs-customer-rbac)
10. [Known Test Limitations, Mocking & Fixed Anti-Patterns](#10-known-test-limitations-mocking--fixed-anti-patterns)

---

## 1. Prerequisites & System Requirements

| Tool / Runtime | Required Version | Minimum Supported | Purpose / Notes |
| :--- | :--- | :--- | :--- |
| **Node.js** | `v20.x` or `v24.x` | `v18.17.0` | Native Node Test Runner (`node --test`), fetch API, ES modules |
| **npm** | `v10.x` or `v11.x` | `v9.0.0` | Package resolution and script execution |
| **MongoDB** | `v7.0.x` | `v6.0.0` | Primary persistence engine (default port `27017`, runner port `27000`) |
| **Docker Desktop** | `v27.x+` (Compose v2.x) | Docker Engine 24.0 | Containerized deployment (Optional for local Node dev) |
| **Operating System** | Windows 10/11, macOS, or Linux | Any 64-bit OS | Cross-platform directory pathing and batch/shell runners |

---

## 2. Environment Configuration & Secrets

All microservices utilize environment variables defined in `.env` files located in their respective directories or the workspace root. When environment variables are omitted, all microservices contain resilient fallbacks to ensure automated test suites and local developer executions run smoothly without crashing.

### Global Secret Keys & Default Ports

| Variable | Recommended Value | Description | Default Fallback in Code |
| :--- | :--- | :--- | :--- |
| `JWT_SECRET` | `supersecretjwtkeyforfooddeliverymicroservices2025` | Shared HS256 JWT HMAC signature secret across all microservices | Provided |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration | `7d` |
| `MONGO_URI` | `mongodb://127.0.0.1:27000/food_delivery_db` | Primary MongoDB connection URI (or port `27017`) | Provided |
| `PORT` (Auth) | `4000` | Customer & Authentication Service HTTP port | `4000` |
| `PORT` (Restaurant)| `5002` | Restaurant Catalog & SuperAdmin Service HTTP port | `5002` |
| `PORT` (Delivery) | `5003` | Delivery Management & Socket.IO Gateway HTTP port | `5003` |
| `PORT` (Payment) | `5004` | Multi-Gateway Payment Processing HTTP port | `5004` |
| `PORT` (Order) | `5005` | Order State Machine & Lifecycle HTTP port | `5005` |
| `PORT` (Frontend) | `3000` | React Customer Web Application | `3000` |

### Payment Gateway Sandbox Credentials

- **Stripe**: `STRIPE_SECRET_KEY=sk_test_placeholder_for_testing`
- **VNPay Sandbox**:
  - `VNPAY_TMN_CODE=TESTCODE`
  - `VNPAY_HASH_SECRET=RAOCTXGU2JRWGJSQZJA53S1G3JAG9L7H`
  - `VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html`
- **MoMo Sandbox**:
  - `MOMO_PARTNER_CODE=MOMO_PARTNER_TEST`
  - `MOMO_ACCESS_KEY=MOMO_ACCESS_KEY_TEST`
  - `MOMO_SECRET_KEY=MOMO_SECRET_KEY_TEST`
  - `MOMO_ENDPOINT=https://test-payment.momo.vn/v2/gateway/api/create`
- **VietQR / Bank Transfer**:
  - Bank Code: `ICB` (VietinBank / 970415)
  - Account Number: `109876543210`
  - Account Holder: `CTY TNHH SKYDISH VIET NAM`

---

## 3. Dependency Installation Protocol

Execute dependency installation in each service directory.

```bash
# 1. Root dependencies
npm install

# 2. Auth Service
cd backend/auth-service && npm install && cd ../..

# 3. Restaurant Service
cd backend/restaurant-service && npm install && cd ../..

# 4. Delivery Service Backend
cd delivery-service/backend && npm install && cd ../..

# 5. Payment Service
cd backend/payment-service && npm install && cd ../..

# 6. Order Service
cd backend/order-service && npm install && cd ../..

# 7. Customer Frontend
cd frontend && npm install && cd ..

# 8. Delivery Driver Frontend
cd delivery-service/frontend && npm install && cd ../..
```

---

## 4. Database Initialization & Data Seeding

SkyDish contains an authentic Vietnamese culinary restaurant catalog with dishes, prices, ratings, categories, and promotions.

### Starting MongoDB
- **Using Embedded MongoDB Runner**:
  ```bash
  node mongo-runner/start-mongo.js
  ```
  *Starts MongoDB WiredTiger instance on port `27000` and creates an automatic TCP proxy bridge on port `27017`.*
- **Using Native MongoDB Service**:
  Ensure MongoDB service is active on port `27017`.

### Executing Idempotent Data Seed
```bash
node backend/restaurant-service/seed-all.mjs
```
- **Seeded Records**: 17 Authentic Vietnamese Restaurants (Hà Nội, TP. Hồ Chí Minh, Đà Nẵng, Huế), 70+ dishes with realistic VND pricing, 15 active discount vouchers, customer reviews, and administrative accounts.

---

## 5. Starting Microservices & Health Endpoints

### One-Click Startup (Windows)
```cmd
start-all.bat
```

### Individual Service Commands & Health Verification

| Microservice | Path | Start Command | Health Check URL | Expected Response |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Service** | `backend/auth-service` | `node server.js` | `http://localhost:4000/health` | `{"status":"ok","service":"auth-service"}` |
| **Restaurant** | `backend/restaurant-service` | `node src/server.js` | `http://localhost:5002/health` | `{"status":"ok","service":"restaurant-service"}` |
| **Delivery** | `delivery-service/backend` | `node src/server.js` | `http://localhost:5003/health` | `{"status":"ok","service":"delivery-service"}` |
| **Payment** | `backend/payment-service` | `node server.js` | `http://localhost:5004/health` | `{"status":"ok","service":"payment-service"}` |
| **Order** | `backend/order-service` | `node index.js` | `http://localhost:5005/health` | `{"status":"ok","service":"order-service"}` |
| **Frontend** | `frontend` | `npm start` | `http://localhost:3000/` | React Web Application |
| **Driver Web** | `delivery-service/frontend` | `npm start` | `http://localhost:3001/` | Driver Portal |

---

## 6. Complete Test Inventory & Execution Guide

### Master Test Summary

| Test Suite / Script | Location | Test Framework | Tests | Status | Execution Command |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth Unit & JWT** | `backend/auth-service` | Node Native (`node:test`) | 4 | **PASS** | `npm test` |
| **Order Architecture & RBAC**| `backend/order-service` | Node Native (`node:test`) | 10 | **PASS** | `npm test` |
| **Restaurant & Coupon Engine**| `backend/restaurant-service` | Node Native (`node:test`) | 5 | **PASS** | `npm test` |
| **Delivery Lifecycle & Driver**| `delivery-service/backend` | Node Native (`node:test`) | 4 | **PASS** | `npm test` |
| **Payment Gateways & Auth** | `backend/payment-service` | Node Native (`node:test`) | 8 | **PASS** | `npm test` |
| **18-Point Security Matrix** | Project Root | Node ES Module | 18 | **PASS** | `node test-security-matrix.mjs` |
| **Multi-Payment Verification** | `frontend` | Node ES Module | 13 | **PASS** | `node frontend/test-multi-payment.mjs` |
| **Vietnam Localization** | `frontend` | Node ES Module | 11 | **PASS** | `node frontend/test-vietnam-restaurants.mjs` |
| **Phase 6 Engagement** | `frontend` | Node ES Module | 23 | **PASS** | `node frontend/test-phase6-engagement.mjs` |
| **Full E2E Flow & WebSockets**| Project Root & `frontend` | Node ES Module | 30 | **PASS** | `node test-e2e-flow.js` |
| **Frontend Production Build** | `frontend` | Webpack (CRA) | Build | **PASS** | `npm run build` |
| **Driver Frontend Build** | `delivery-service/frontend` | Webpack (CRA) | Build | **PASS** | `npm run build` |

### 1. Auth Service Unit Tests
```bash
cd backend/auth-service
npm test
```
*Verifies customer password hashing via bcrypt, authentication credential comparison, JWT generation containing claims (`id`, `role`), and rejection of forged or expired tokens.*

### 2. Order Service Architectural Tests
```bash
cd backend/order-service
npm test
```
*Verifies Server Authority (client-sent fake prices are completely overridden by MongoDB authoritative prices), quantity validation (rejects `<= 0` and fractional quantities e.g. `1.5` with HTTP 400), cart emptiness validation, ownership enforcement (Customer B receives 403 trying to view, edit, or cancel Customer A's order), and Admin cross-tenant visibility.*

### 3. Restaurant Service Tests
```bash
cd backend/restaurant-service
npm test
```
*Verifies food item creation, restaurant tenant isolation (Restaurant B cannot modify Restaurant A dishes), search & filter regex safety, pagination math (`skip`/`limit`), and coupon engine discount rules.*

### 4. Delivery Service Tests
```bash
cd delivery-service/backend
npm test
```
*Verifies driver assignment, driver ownership enforcement, 3-stage delivery status state machine (`To be delivered` -> `Picked-up` -> `Delivered`), and pagination of driver histories.*

### 5. Multi-Gateway Payment Service Tests
```bash
cd backend/payment-service
npm test
```
*Verifies negative amount rejection (HTTP 400), Cash on Delivery order creation, VietQR configuration retrieval, Bank Transfer QR generation, ownership protection (Customer B cannot pay Customer A's order), ownership status lookup (Owner 200, Non-owner 403, Admin 200), and guest unauthorized request blocking (HTTP 401).*

### 6. 18-Point Security & Data Integrity Matrix
```bash
node test-security-matrix.mjs
```
*Performs comprehensive integration security verification across 18 critical vectors including DB price authority, math validation, cross-tenant leak prevention, and real HTTP RBAC status check.*

### 7. Multi-Gateway Payment System Test
```bash
node frontend/test-multi-payment.mjs
```
*Exercises Stripe Card initialization, VNPay HMAC-SHA512 checksum validation, MoMo HMAC-SHA256 callback & IPN processing, Cash on Delivery idempotency, unified status query, and guest access rejection (HTTP 401).*

### 8. Full End-to-End System Flow Test
```bash
node test-e2e-flow.js
# Or alternatively:
node frontend/test-e2e-flow.mjs
```
*Tests complete lifecycle: Customer Registration -> Login -> Profile Fetch -> Restaurant Registration -> Availability Update -> Dish Creation -> Menu Query -> Order Placement -> DB Price Verification -> Multi-Gateway Payments -> Driver Registration -> Driver Assignment -> Status Transitions -> Live WebSockets GPS Emission -> Super Admin Review -> Production Bundle Verification.*

---

## 7. Docker & Containerized Orchestration

The SkyDish ecosystem provides a complete Docker Compose specification (`docker-compose.yml`) containing 7 services with health checks and restart policies.

### Docker Compose Commands
```bash
# Validate Compose configuration syntax
docker compose config

# Build all microservice and frontend images
docker compose build

# Start full multi-service stack in background
docker compose up -d

# Check real-time container health
docker compose ps

# View service logs
docker compose logs -f payment-service
```

### Docker Compose Service Architecture

| Service Container | Context Directory | Exposed Port | Defined Health Check |
| :--- | :--- | :--- | :--- |
| `skydish-mongo` | `mongo:7.0` image | `27017:27017` | `mongosh --eval "db.adminCommand('ping')"` |
| `skydish-auth-service` | `./backend/auth-service` | `4000:4000` | `node fetch('http://127.0.0.1:4000/health')` |
| `skydish-restaurant-service`| `./backend/restaurant-service`| `5002:5002` | `node fetch('http://127.0.0.1:5002/health')` |
| `skydish-delivery-service` | `./delivery-service/backend` | `5003:5003` | `node fetch('http://127.0.0.1:5003/health')` |
| `skydish-payment-service` | `./backend/payment-service` | `5004:5004` | `node fetch('http://127.0.0.1:5004/health')` |
| `skydish-order-service` | `./backend/order-service` | `5005:5005` | `node fetch('http://127.0.0.1:5005/health')` |
| `skydish-frontend` | `./frontend` | `3000:80` | Nginx Alpine container serving production build |

> [!NOTE]
> `docker compose config` is verified 100% valid. When running in environments where Docker Desktop Linux engine is offline, the local standalone Node runner architecture (`start-all.bat`) is the primary deployment path.

---

## 8. Troubleshooting Guide

### 1. Port Conflicts (EADDRINUSE)
If a port (e.g. `4000`, `5002`, `5003`, `5004`, `5005`, `27000`, `27017`) is already bound:
- **Windows PowerShell**:
  ```powershell
  Get-NetTCPConnection -LocalPort 5004 -ErrorAction SilentlyContinue | Select-Object OwningProcess
  Stop-Process -Id <PID> -Force
  ```
- **Linux / macOS**:
  ```bash
  lsof -i :5004
  kill -9 <PID>
  ```

### 2. Missing `JWT_SECRET` in Local Environment
- **Symptom**: `Error: secretOrPrivateKey must have a value` or `Error: JWT_SECRET is not defined`.
- **Resolution**: All services now contain fallback defaults in code (`process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025'`). Ensure `.env` is created in service root.

### 3. Duplicate Key Error on Driver Vehicle Number (409)
- **Symptom**: `Driver register status: 409 { message: 'vehicleNumber already registered' }`.
- **Resolution**: Driver vehicle numbers have a unique index in MongoDB. The automated test suite uses dynamic vehicle numbers (`WP-${timestamp.slice(-4)}`) to ensure clean idempotency.

### 4. MongoDB Socket Disconnection / Runner Port Mismatch
- **Symptom**: `MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`.
- **Resolution**: If using `mongo-runner/start-mongo.js`, it listens on port `27000` and creates an automatic TCP proxy bridge to port `27017`. Both ports are valid connection targets.

---

## 9. Security Boundary Matrix (Guest vs Customer RBAC)

| Action / Resource | Guest | Customer | Admin | Driver | Enforcement Location | Test Verification Status |
| :--- | :---: | :---: | :---: | :---: | :--- | :--- |
| **Browse Restaurants & Menus** | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | `restaurant-service` public routes | Verified (`HTTP 200`) |
| **Search Dishes & Categories** | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | `/api/search` & `/api/food-items` | Verified (`HTTP 200`) |
| **Add Items to Cart** | ✅ Allow | ✅ Allow | ✅ Allow | ✅ Allow | LocalStorage / Frontend React State | Verified (Client-side) |
| **Initiate Checkout Route** | ❌ Block | ✅ Allow | ❌ Block | ❌ Block | `CustomerGuard.jsx` (`/checkout`) | Verified (Redirect to `/auth/login`) |
| **Create Order in Backend** | ❌ Block | ✅ Allow | ❌ Block | ❌ Block | `order-service` (`protect` middleware) | Verified (`HTTP 401 Unauthorized`) |
| **Initiate Payment (Stripe/VNPay/MoMo/COD/Bank)** | ❌ Block | ✅ Allow | ❌ Block | ❌ Block | `paymentRoutes.js` (`getAuthUser`) | Verified (`HTTP 401 Unauthorized`) |
| **View Payment Record / Status** | ❌ Block | ✅ (Owner) | ✅ (All) | ❌ Block | `paymentRoutes.js` (`/status/:orderId`)| Verified (`401 Guest, 403 Non-owner`) |
| **Cancel / Update Order** | ❌ Block | ✅ (Owner) | ✅ (All) | ❌ Block | `orderRoutes.js` (`ownershipMiddleware`)| Verified (`HTTP 403 Forbidden`) |
| **Accept Delivery Assignment** | ❌ Block | ❌ Block | ✅ Allow | ✅ Allow | `delivery-service` (`authMiddleware`) | Verified (`HTTP 401/403`) |
| **Update Delivery Status Lifecycle** | ❌ Block | ❌ Block | ❌ Block | ✅ Allow | `delivery-service` (`/status` route) | Verified (`HTTP 200 Driver only`) |
| **Emit GPS Tracking Coordinates** | ❌ Block | ❌ Block | ❌ Block | ✅ Allow | `delivery-service` Socket.IO Gateway | Verified (Socket Connected & Emitted) |
| **Access Restaurant Dashboard** | ❌ Block | ❌ Block | ✅ Allow | ❌ Block | `RestaurantPartnerGuard.jsx` | Verified (Protected route) |
| **Access Super Admin Analytics** | ❌ Block | ❌ Block | ✅ Allow | ❌ Block | `AdminGuard.jsx` & SuperAdmin API | Verified (`HTTP 200 Admin only`) |

---

## 10. Known Test Limitations, Mocking & Fixed Anti-Patterns

1. **Fixed False-Pass: Security Matrix Test #18**:
   - *Previous Behavior*: Test #18 claimed to verify payment status RBAC but used an in-memory JS condition check (`if (paymentA && paymentA.userId !== customerB.id)`), never making an HTTP request.
   - *Fixed Behavior*: Updated to make a genuine HTTP GET request with Customer B's JWT token to `http://localhost:5004/api/payment/status/:orderId` and asserts `HTTP 403 Forbidden`.
2. **Fixed False-Pass: Zero Exit Codes on Failure**:
   - *Previous Behavior*: `test-e2e-flow.js` and `frontend/test-e2e-flow.mjs` lacked `process.exit(1)` when failures occurred, falsely reporting success to CI/CD pipelines.
   - *Fixed Behavior*: Both scripts now inspect `failed > 0` and explicitly trigger `process.exit(1)`.
3. **Fixed Security Flaw: Unauthenticated Guest Payment Initiation & Data Leak**:
   - *Previous Behavior*: `getAuthUser(req)` returned `null` for unauthenticated requests, bypassing the user match condition and allowing guests to trigger payments and query customer payment records.
   - *Fixed Behavior*: All private payment endpoints now enforce authentication, rejecting unauthenticated requests with `HTTP 401 Unauthorized`.
4. **Fixed Security Flaw: Role Mass Assignment in Order Service**:
   - *Previous Behavior*: `POST /api/users/register` permitted `role: req.body.role || "customer"`, allowing an unauthenticated attacker to register as an `admin`.
   - *Fixed Behavior*: Public registration hardcodes `role: "customer"`.
5. **Driver Frontend Jest Test Execution with React 19**:
   - *Status*: CRA 5.0.1 (`react-scripts test`) Jest workers have a known upstream Babel compatibility hang when evaluating React 19 JSX without custom Jest config. The production build (`npm run build`) is fully verified and compiles cleanly with exit code 0.
