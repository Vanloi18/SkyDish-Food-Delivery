# GATE F: LIVE FUNCTIONAL & COD REGRESSION AUDIT REPORT

**Execution Timestamp**: 2026-09-13T10:07:35+07:00  
**Status**: **PASS**  
**Auditor**: Principal QA Engineer & Senior SDET  

---

## 1. Executive Summary

Live functional verification and regression testing was executed against the active microservices infrastructure on the host environment (`127.0.0.1`). 

All 8 mandatory operational checkpoints were exercised end-to-end, with 100% compliance across health validation, customer authentication, catalog querying, payment initialization, delivery lifecycle assignment, and bidirectional Socket.IO WebSocket communication.

Most critically, the **COD Price Mutation Regression Test** conclusively demonstrated that selecting Cash on Delivery (COD) does not mutate prices, recalculates all totals under strict Server Authority, protects against client price tampering, and preserves shipping fee thresholds.

---

## 2. Checkpoint Execution Matrix

| # | Domain / Feature | Target Endpoint | HTTP Status | Verdict | Evidence / Details |
|---|---|---|:---:|:---:|---|
| **1a** | Auth Health Check | `GET :4000/health` | 200 | **PASS** | `status: "ok", service: "auth-service"` |
| **1b** | Restaurant Health Check | `GET :5002/health` | 200 | **PASS** | `status: "ok", service: "restaurant-service"` |
| **1c** | Delivery Health Check | `GET :5003/health` | 200 | **PASS** | `status: "ok", service: "delivery-service"` |
| **1d** | Payment Health Check | `GET :5004/health` | 200 | **PASS** | `status: "ok", service: "payment-service"` |
| **1e** | Order Health Check | `GET :5005/health` | 200 | **PASS** | `status: "ok", service: "order-service"` |
| **2** | Customer Registration | `POST :4000/api/auth/register/customer` | 201 | **PASS** | Customer created; JWT token received |
| **3** | Customer Login | `POST :4000/api/auth/login` | 200 | **PASS** | Valid JWT token returned |
| **4a** | Catalog: Restaurants | `GET :5002/api/restaurant` | 200 | **PASS** | 28 restaurants retrieved |
| **4b** | Catalog: Food Items | `GET :5002/api/food-items/all` | 200 | **PASS** | Validated item `Pizza 4 Cheese Kèm Mật Ong` @ 260,000 VND |
| **5a** | **COD Server Authority** | `POST :5005/api/orders` | 201 | **PASS** | Tampered price `1 VND` rejected; recalculated to `520,000 VND` |
| **5b** | **COD Delivery Fee Integrity**| `POST :5005/api/orders` | 201 | **PASS** | Free shipping rule preserved (`subtotal >= 300,000 VND` -> fee = 0) |
| **5c** | **COD Zero Price Mutation** | `POST :5005/api/orders` | 201 | **PASS** | Subtotal (520k) + Delivery (0) - Discount (0) === Total (520k) |
| **6a** | Payment: COD Record | `POST :5004/api/payment/cod/process` | 200 | **PASS** | Record created; `paymentMethod: COD`, `status: Pending` |
| **6b** | Payment: VietQR Gen | `POST :5004/api/payment/bank-transfer/create` | 200 | **PASS** | Bank details verified; dynamic VietQR URL generated |
| **7** | Driver Assignment | `POST :5003/api/delivery/create` | 201 | **PASS** | Delivery entity created; Geocoding coordinates assigned |
| **8a** | Realtime: Order Events | `ws://127.0.0.1:5005` | Connected | **PASS** | Socket.IO handshake successful on order-service |
| **8b** | Realtime: Driver GPS | `ws://127.0.0.1:5003` | Connected | **PASS** | Socket.IO handshake successful on delivery-service |

---

## 3. Deep-Dive: Critical COD Price Regression Audit

### 3.1 Test Methodology
A synthetic price-tampering attack and price mutation audit was conducted:
1. **Catalog Truth**: Item `Pizza 4 Cheese Kèm Mật Ong` has authoritative catalog price of `260,000 VND`.
2. **Order Payload**: Quantity = 2. Client injected fraudulent price: `price: 1 VND`.
3. **Payment Selection**: `paymentMethod: "COD"`.
4. **Authoritative Calculation Equation**:
   $$\text{Total} = \max(0, \text{Subtotal} + \text{DeliveryFee} - \text{Discount})$$
   - $\text{Subtotal} = 2 \times 260{,}000 = 520{,}000\text{ VND}$
   - $\text{DeliveryFee} = 0\text{ VND}$ (Subtotal $\ge 300{,}000\text{ VND}$)
   - $\text{Discount} = 0\text{ VND}$
   - $\text{Expected Total} = 520{,}000\text{ VND}$

### 3.2 Audit Log Trace
```
[Trace] Item: "Pizza 4 Cheese Kèm Mật Ong" @ 260000 VND x 2
[Trace] Expected Subtotal: 520000 VND
[Trace] Expected Delivery Fee: 0 VND
[Trace] Expected Discount: 0 VND
[Trace] Expected Total: 520000 VND
[Server Result] Order ID: 6aa613700edea7d673b29863
[Server Result] Server Subtotal: 520000 (Match: true)
[Server Result] Server Delivery Fee: 0 (Match: true)
[Server Result] Server Discount: 0 (Match: true)
[Server Result] Server Total Price: 520000 (Match: true)
```

### 3.3 Confirmation
1. Client price tampering was completely ignored.
2. Selecting COD did not introduce any hidden surcharges or mutations.
3. Order subtotal, delivery fee, and grand total matched the authoritative cart amount down to the exact single VND.

---

## 4. Gate F Sign-Off
- Total Checkpoints: **17**
- Checkpoints Passed: **17**
- Checkpoints Failed: **0**
- COD Regression Result: **PASS (ZERO MUTATION CONFIRMED)**
- Overall Gate F Result: **PASS**
