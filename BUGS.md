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
