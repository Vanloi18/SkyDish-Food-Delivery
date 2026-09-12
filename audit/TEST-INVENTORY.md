# SKYDISH PLATFORM — TEST INVENTORY & VERIFICATION SUITES
**Audit Standard:** Strict Evidence-Based Zero-Trust  
**Total Test Suites:** 14  
**Master Runners:** `node scripts/test-all.mjs` / `powershell -File .\\scripts\\test-all.ps1`  

---

## 1. MASTER TEST SUITE INVENTORY

| # | Test Suite | File Location | Test Count | Assertion Target | Status |
| :---: | :--- | :--- | :---: | :--- | :---: |
| 1 | **Environment Check** | `scripts/test-all.mjs` | 1 | Node.js v18+ runtime verification | **PASS** |
| 2 | **Health Checks** | `scripts/test-all.mjs` | 5 | All 5 microservices HTTP 200 health | **PASS** |
| 3 | **Auth Service Unit** | `backend/auth-service/tests/` | 4 | Password hash, JWT token, tampering | **PASS** |
| 4 | **Order Service Unit** | `backend/order-service/tests/` | 10 | Server authority, cart validation, RBAC | **PASS** |
| 5 | **Restaurant Service Unit** | `backend/restaurant-service/tests/` | 5 | CRUD, search, pagination, coupons | **PASS** |
| 6 | **Delivery Service Unit** | `delivery-service/backend/tests/` | 4 | Assignment, ownership, lifecycle | **PASS** |
| 7 | **Payment Service Unit** | `backend/payment-service/tests/` | 8 | COD, VietQR, RBAC, Guest 401 | **PASS** |
| 8 | **18-Point Security Matrix** | `test-security-matrix.mjs` | 18 | Live HTTP 403, Data isolation, JWT | **PASS** |
| 9 | **Payment Gateway Verification** | `frontend/test-multi-payment.mjs` | 13 | Stripe, VNPay SHA512, MoMo, COD, 401 | **PASS** |
| 10 | **Vietnam Localization** | `frontend/test-vietnam-restaurants.mjs` | 11 | 17 VN restaurants, VND format, Hanoi | **PASS** |
| 11 | **Phase 6 Customer Engagement** | `frontend/test-phase6-engagement.mjs` | 23 | Search, coupons, reviews, notifications | **PASS** |
| 12 | **End-to-End Master Flow** | `frontend/test-e2e-flow.mjs` | 30 | Customer -> Restaurant -> Driver -> Socket | **PASS** |
| 13 | **Frontend Production Build** | `frontend/build/index.html` | 1 | Webpack production bundle (342 kB) | **PASS** |
| 14 | **Docker Runtime & Compose** | `docker-compose.yml` | 1 | Compose syntax & container readiness | **BLOCKED*** |

**Note: Docker Compose config is valid. Host Docker Desktop engine is offline.*
