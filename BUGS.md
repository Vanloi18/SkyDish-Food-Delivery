# SKYDISH FOOD DELIVERY PLATFORM — DEFECT REGISTER & RESOLUTION LOG
**Version:** 3.0-EVIDENCE-DRIVEN  
**Audit Date:** 2026-09-13  

---

## 1. RESOLVED DEFECTS SUMMARY

| Bug ID | Severity | Component | Status | Description |
| :--- | :---: | :--- | :---: | :--- |
| **BUG-001** | **P0** | `payment-service` | **VERIFIED FIXED** | Unauthenticated guest could access private payment endpoints. |
| **BUG-002** | **P0** | `order-service` | **VERIFIED FIXED** | Mass assignment privilege escalation to `admin` during customer signup. |
| **BUG-003** | **P1** | `payment-service` | **VERIFIED FIXED** | Payment service hung when synchronizing with order-service via localhost due to Docker IPv6 proxy. |
| **BUG-004** | **P1** | Infrastructure | **VERIFIED FIXED** | Microservices crashed on launch if `.env` was absent. |
| **BUG-005** | **P1** | Root E2E Runner | **VERIFIED FIXED** | Root `test-e2e-flow.js` failed to resolve ESM dependencies. |
| **BUG-006** | **P2** | PowerShell CI | **VERIFIED FIXED** | Windows PowerShell 5.1 crashed on unicode emojis. |
| **BUG-007** | **P2** | Security Matrix | **VERIFIED FIXED** | Test #18 had an in-memory mock instead of live HTTP assertion. |
| **BUG-008** | **P1** | `delivery-service` | **VERIFIED FIXED** | Hardcoded OpenCage API key & Sri Lanka fallback coordinates in geocode utility. |
| **BUG-009** | **P1** | `payment-service` | **VERIFIED FIXED** | Hardcoded personal bank details in bank transfer / VietQR provider. |
| **BUG-010** | **P1** | Infrastructure | **VERIFIED FIXED** | Docker Compose MONGO_URI collision with host dev port 27000. |
| **BUG-011** | **P2** | Security / Reliability | **VERIFIED FIXED** | Missing production fail-fast check for insecure/default JWT_SECRET in production mode. |

---

## 2. DETAILED ROOT CAUSE & VERIFICATION

### BUG-001 (P0): Payment Service Guest Access Leak
- **Root Cause:** `backend/payment-service/routes/paymentRoutes.js` lacked an authentication guard on `POST /process`, `POST /cod/process`, `POST /vnpay/create`, and `GET /status/:orderId`.
- **Fix:** Added `getAuthUser(req)` check returning `HTTP 401 Unauthorized` when unauthenticated requests are received.
- **Verification:** Unit test #7 & #8 and Multi-payment suite Test #6 confirm `HTTP 401`.

### BUG-002 (P0): User Registration Privilege Escalation
- **Root Cause:** `backend/order-service/controllers/userController.js` accepted `role` directly from `req.body` during registration.
- **Fix:** Enforced default `role: "customer"` unconditionally.
- **Verification:** Security Matrix Test #1 & Auth Unit tests verify customer role assignment.

### BUG-003 (P1): Inter-service Socket Hang on IPv6
- **Root Cause:** `codProvider.js` and `bankTransferProvider.js` targeted `http://localhost:5005`. When Docker Desktop stopped, zombie proxy processes intercepted IPv6 `::1` traffic and hung indefinitely.
- **Fix:** Switched destination URL to `http://127.0.0.1:5005` with explicit `{ timeout: 3000 }` and terminated orphaned proxy containers.
- **Verification:** Test suite runs instantaneously without hangs.

### BUG-008 (P1): Hardcoded OpenCage API Key & Foreign Coordinates
- **Root Cause:** `delivery-service/backend/src/utils/geocode.js` contained a hardcoded API key and default coordinates for Colombo, Sri Lanka (`[79.8612, 6.9271]`).
- **Fix:** Refactored to read `process.env.OPENCAGE_API_KEY` and set fallback coordinates to Ho Chi Minh City, Vietnam (`[106.7009, 10.7769]`).
- **Verification:** Secret scanner passes with 0 leaks; geocoding fallback verified in live delivery creation test.

### BUG-009 (P1): Hardcoded Personal Bank Account Details
- **Root Cause:** `backend/payment-service/services/paymentProviders/bankTransferProvider.js` defaulted to developer personal account details (`LE VAN LOI`).
- **Fix:** Replaced with configurable environment variables and standard corporate defaults (`SKYDISH FOOD DELIVERY`, `VietinBank`).
- **Verification:** Multi-payment suite & Gate F VietQR tests verify correct template and bank code `ICB`/`970415`.

### BUG-010 (P1): Docker Compose MONGO_URI Variable Collision
- **Root Cause:** `docker-compose.yml` used `${MONGO_URI:-mongodb://mongo:27017/...}` which inherited the host `.env` connection string (`mongodb://127.0.0.1:27000`), breaking container networking inside Docker.
- **Fix:** Separated container connection string to `${DOCKER_MONGO_URI:-mongodb://mongo:27017/food_delivery_db}`.
- **Verification:** `docker compose config` verifies proper container DNS resolution.

### BUG-011 (P2): Production Mode Insecure Secret Guardrail Absence
- **Root Cause:** Microservices could boot in production mode (`NODE_ENV=production`) while using development fallback JWT secrets.
- **Fix:** Added fail-fast check in all 5 microservices that logs a fatal error and terminates the process (`process.exit(1)`) if `JWT_SECRET` is missing or insecure in production mode.
- **Verification:** Subshell test matrix under `NODE_ENV=production` verified exit code 1 across all 5 services.

