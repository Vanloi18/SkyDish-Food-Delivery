# SKYDISH
# FINAL VERIFICATION & PRODUCTION READINESS AUDIT

**Dự án**: SKYDISH – Food Delivery / E-Commerce Microservices  
**Ngày kiểm toán**: 05/09/2026  
**Đơn vị thực hiện**: Senior QA Engineer + Technical Auditor + Software Architect  
**Nguyên tắc cốt lõi**: Tất cả kết luận, con số và bảng ma trận đều dựa trên lệnh thực thi và output thực tế của terminal. Tuyệt đối không giả định hay bịa đặt kết quả.

---

## 1. Executive Summary

Hệ thống SkyDish đã trải qua đợt kiểm toán và thẩm định độc lập toàn diện (Final Verification & Production Readiness Audit).
Kết quả kiểm tra thực tế:
- **Service Unit & Integration Tests**: Toàn bộ **29 / 29 test cases** phân bổ trên 5 microservices backend đều chạy thực tế và **PASS 100%**.
- **Platform Security & Data Integrity Matrix**: Toàn bộ **18 / 18 tiêu chí an toàn thông tin** và quy tắc nghiệp vụ khắt khe đã được xác thực độc lập và **PASS 100%**.
- **Frontend Production Build**: Đã biên dịch thành công production bundle qua Webpack với **mã thoát 0 (Compiled successfully)**.
- **Docker Compose Configuration**: Tệp cấu hình `docker-compose.yml` định nghĩa 7 dịch vụ đã được xác thực hợp lệ qua `docker compose config` với **mã thoát 0**.
- **Hạ tầng Runtime (Docker & Kubernetes)**: Được phân loại minh bạch là **NOT VERIFIED** do tiến trình Docker daemon và cụm Kubernetes cục bộ chưa được kích hoạt trên máy chủ thử nghiệm.

---

## 2. Verification Classification

Toàn bộ các thành phần trong báo cáo được phân loại chính xác theo 3 cấp độ kiểm chứng:

- **[A] VERIFIED BY EXECUTION**: Đã thực thi lệnh thực tế trong terminal, bắt giữ mã thoát `exit code: 0` và log kết quả từ runtime process.
- **[B] STATICALLY VERIFIED**: Đã kiểm tra cú pháp, cấu trúc tệp tin, schema YAML và tính toàn vẹn tĩnh của mã nguồn mà không cần môi trường runtime.
- **[C] NOT VERIFIED**: Chưa thể kiểm chứng runtime do hạ tầng tương ứng không khả dụng trên môi trường thử nghiệm (không bịa đặt kết quả).

---

## 3. Final Verification Matrix

| Component / Hạng Mục | Lệnh Thực Thi (Command) | Kết Quả Thực Tế | Phân Loại | Bằng Chứng Thực Tế (Evidence) |
| :--- | :--- | :---: | :---: | :--- |
| **Auth Service Tests** | `npm test` | **PASS** | **[A]** | `✔ 4 passed, 0 failed, duration: 2180ms` (node --test) |
| **Order Service Tests** | `npm test` | **PASS** | **[A]** | `✔ 10 passed, 0 failed, duration: 1130ms` (node --test) |
| **Restaurant Service Tests** | `npm test` | **PASS** | **[A]** | `✔ 5 passed, 0 failed, duration: 1330ms` (node --test) |
| **Delivery Service Tests** | `npm test` | **PASS** | **[A]** | `✔ 4 passed, 0 failed, duration: 1382ms` (node --test) |
| **Payment Service Tests** | `npm test` | **PASS** | **[A]** | `✔ 6 passed, 0 failed, duration: 2148ms` (node --test) |
| **Security Matrix (18 tiêu chí)**| `node test-security-matrix.mjs` | **PASS** | **[A]** | `18/18 PASSED \| 0/18 FAILED` (Duration: 2200ms) |
| **Frontend Production Build** | `npm run build` | **PASS** | **[A]** | `Compiled successfully. Exit code: 0` (Webpack) |
| **Docker Compose Configuration**| `docker compose config` | **PASS** | **[A]** | `Exit code: 0, 7 services validated` |
| **Docker Build / Runtime** | `docker compose build / up` | **NOT VERIFIED** | **[C]** | Docker daemon offline (`//./pipe/dockerDesktopLinuxEngine`) |
| **Kubernetes Static Manifests**| YAML Schema Inspection | **PASS** | **[B]** | Cú pháp hợp lệ cho `secrets`, `mongo`, `deployment`, `service` |
| **Kubernetes Runtime Deployment**| `kubectl apply` | **NOT VERIFIED** | **[C]** | Cluster offline (`dial tcp [::1]:8080: connectex refused`) |

---

## 4. Service Test Results

Toàn bộ 5 microservices backend đều sử dụng Node.js native test runner (`node --test`), chạy trực tiếp với cơ sở dữ liệu MongoDB thực tế trên cổng 27000:

### 4.1 Auth Service (`backend/auth-service`)
- **Lệnh thực thi**: `node --test tests/*.test.js`
- **Số lượng**: 4 / 4 PASS (0 failed, 0 skipped)
- **Danh sách tests**:
  1. `should register a new customer with hashed password` (PASS)
  2. `should verify correct password using comparePassword` (PASS)
  3. `should generate valid JWT containing customer id and role` (PASS)
  4. `should reject invalid or tampered JWT` (PASS)

### 4.2 Order Service (`backend/order-service`)
- **Lệnh thực thi**: `node --test tests/*.test.js`
- **Số lượng**: 10 / 10 PASS (0 failed, 0 skipped)
- **Danh sách tests**:
  1. `SERVER AUTHORITY: overrides client-sent fake price and fake total with authoritative DB price` (PASS)
  2. `VALIDATION: rejects order with invalid quantity <= 0 with 400 Bad Request` (PASS)
  3. `VALIDATION: rejects order with fractional quantity e.g. 1.5 with 400 Bad Request` (PASS)
  4. `VALIDATION: rejects empty cart with 400 Bad Request` (PASS)
  5. `OWNERSHIP RULE: Customer A can fetch their own order details` (PASS)
  6. `OWNERSHIP RULE (CRITICAL): Customer B CANNOT view Customer A order -> 403 Forbidden` (PASS)
  7. `OWNERSHIP RULE (CRITICAL): Customer B CANNOT cancel Customer A order -> 403 Forbidden` (PASS)
  8. `ADMIN ACCESS: Admin can view any order` (PASS)
  9. `DATA LEAK PREVENTION: getOrdersService only returns User A orders for User A` (PASS)
  10. `OWNERSHIP CANCELLATION: Customer A can cancel their own order` (PASS)

### 4.3 Restaurant Service (`backend/restaurant-service`)
- **Lệnh thực thi**: `node --test tests/*.test.js`
- **Số lượng**: 5 / 5 PASS (0 failed, 0 skipped)
- **Danh sách tests**:
  1. `FOOD CREATION: restaurant can create food items attached to their store` (PASS)
  2. `OWNERSHIP ENFORCEMENT: restaurant B cannot modify restaurant A food item` (PASS)
  3. `SEARCH & FILTER: can query by name and price range with regex safety` (PASS)
  4. `PAGINATION: verify skip and limit returns correct page count and metadata` (PASS)
  5. `VOUCHER ENGINE: validate coupon minOrderValue and discount calculation` (PASS)

### 4.4 Delivery Service (`delivery-service/backend`)
- **Lệnh thực thi**: `node --test tests/*.test.js`
- **Số lượng**: 4 / 4 PASS (0 failed, 0 skipped)
- **Danh sách tests**:
  1. `DELIVERY ASSIGNMENT: delivery is correctly linked to assigned driver` (PASS)
  2. `OWNERSHIP ENFORCEMENT: Driver B is not the owner of Driver A delivery` (PASS)
  3. `STATUS LIFECYCLE: delivery progresses through To be delivered -> Picked-up -> Delivered` (PASS)
  4. `PAGINATION: get driver deliveries supports page and limit slicing` (PASS)

### 4.5 Payment Service (`backend/payment-service`)
- **Lệnh thực thi**: `node --test`
- **Số lượng**: 6 / 6 PASS (0 failed, 0 skipped)
- **Danh sách tests**:
  1. `1. Reject payment when amount <= 0` (PASS)
  2. `2. Process Cash on Delivery (COD) payment successfully` (PASS)
  3. `3. Return Bank Transfer / VietQR configuration` (PASS)
  4. `4. Create Bank Transfer payment successfully` (PASS)
  5. `5. Prevent Customer B from paying/modifying Customer A payment (RBAC Ownership)` (PASS)
  6. `6. Enforce ownership on status lookup: Owner vs Other User vs Admin` (PASS)

> **Tổng số Service Tests**: **29 / 29 PASS (100%)**

---

## 5. Security Matrix (18 Criteria)

Lệnh thực thi độc lập: `node test-security-matrix.mjs`  
Kết quả thực tế: **18 / 18 PASSED | 0 / 18 FAILED**

1. **#1 Server Authority**: `customerId` được gán độc quyền từ JWT context (không tin cậy body client).
2. **#2 Server Authority**: Giá món ăn giả mạo (1đ) bị ghi đè bằng giá niêm yết trong DB (65.000đ).
3. **#3 Server Authority**: Tổng tiền giả mạo (1đ) bị ghi đè bằng phép tính có thẩm quyền (145.000đ).
4. **#4 Validation**: Đặt hàng với số lượng `quantity = 0` bị từ chối với HTTP 400.
5. **#5 Validation**: Đặt hàng với số lượng âm (`-1`) hoặc số thập phân (`1.5`) bị từ chối với HTTP 400.
6. **#6 Validation**: Đặt hàng với giỏ hàng rỗng `items: []` bị từ chối với HTTP 400.
7. **#7 Validation**: Đặt món ăn không tồn tại trong DB bị từ chối với HTTP 404.
8. **#8 Coupon Engine**: Áp dụng mã giảm giá hợp lệ trừ đúng 20.000đ theo chính sách voucher.
9. **#9 Coupon Security**: Mã giảm giá giả / hết hạn bị bỏ qua với discount = 0đ.
10. **#10 Data Leak Prevention**: Khách hàng A tra cứu đơn hàng trả về đúng 0 đơn hàng của Khách hàng B.
11. **#11 Ownership Rule**: Khách hàng A truy cập chi tiết đơn hàng của chính mình (HTTP 200).
12. **#12 Ownership Rule (CRITICAL)**: Khách hàng B bị từ chối truy cập chi tiết đơn của A với HTTP 403 Forbidden.
13. **#13 Ownership Rule (CRITICAL)**: Khách hàng B bị từ chối hủy đơn của A với HTTP 403 Forbidden.
14. **#14 Ownership Rule (CRITICAL)**: Khách hàng B bị từ chối sửa thông tin đơn của A với HTTP 403 Forbidden.
15. **#15 RBAC Privilege**: Quản trị viên (Admin) được phép tra cứu bất kỳ đơn hàng nào để kiểm toán.
16. **#16 Authentication**: Request không có Authorization token bị từ chối với HTTP 401/403.
17. **#17 Payment Security**: Bản ghi thanh toán gắn chặt với chủ sở hữu đơn hàng (Khách B không thể can thiệp).
18. **#18 Payment RBAC**: Tra cứu trạng thái thanh toán đơn người khác qua `/status/:orderId` bị từ chối với HTTP 403.

---

## 6. Frontend Build

- **Lệnh thực thi**: `npm run build` tại thư mục `frontend/`
- **Kết quả thực tế**: `Compiled successfully. Exit code: 0`
- **Chi tiết gói build**:
  - `build/static/js/main.4a8be2e7.js`: 342.48 kB (gzipped)
  - `build/static/js/239.fcaddd2b.chunk.js`: 46.37 kB (gzipped)
  - `build/static/css/main.ef99091c.css`: 40.61 kB (gzipped)
  - `build/static/js/732.447e1da6.chunk.js`: 33.59 kB (gzipped)
  - `build/static/js/977.19a68214.chunk.js`: 8.50 kB (gzipped)
- **Đánh giá**: Toàn bộ 143 modules và components React đã được biên dịch tối ưu hóa production thành công, không còn lỗi cú pháp hay biến chưa định nghĩa.

---

## 7. Docker Verification

Báo cáo phân định rạch ròi 3 tầng kiểm tra Docker:

### 7.1 Configuration Verification (`docker compose config`)
- **Trạng thái**: **[A] VERIFIED BY EXECUTION**
- **Kết quả**: Exit code `0`. Tệp `docker-compose.yml` định nghĩa hợp lệ 7 dịch vụ (`mongo`, `auth-service`, `restaurant-service`, `order-service`, `delivery-service`, `payment-service`, `frontend`), ánh xạ cổng, biến môi trường, volume `mongo-data` và mạng nội bộ `skydish-network`.

### 7.2 Build Verification (`docker compose build`)
- **Trạng thái**: **[C] NOT VERIFIED**
- **Lý do**: Lệnh không thể kết nối tới Docker engine (`open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified`). Tiến trình Docker Desktop daemon chưa được bật trên máy Windows host.

### 7.3 Runtime Verification (`docker compose up`)
- **Trạng thái**: **[C] NOT VERIFIED**
- **Lý do**: Không có Docker daemon khả dụng để khởi động containers. Cấu hình tệp Compose hợp lệ không đồng nghĩa với việc runtime containers đã được kiểm chứng trực tiếp trong phiên này.

---

## 8. Kubernetes Verification

Báo cáo phân định rạch ròi 2 tầng kiểm tra Kubernetes:

### 8.1 Static Manifest Validation
- **Trạng thái**: **[B] STATICALLY VERIFIED**
- **Kết quả**: Tất cả 4 tệp YAML tại thư mục `k8s/` đã được đối soát cấu trúc và cú pháp tĩnh:
  - `k8s/secrets.yaml`: Định nghĩa Secret Opaque cho `MONGO_URI`, `JWT_SECRET`, Stripe keys.
  - `k8s/mongo.yaml`: Định nghĩa Deployment MongoDB Stateful kèm Service cổng 27017.
  - `k8s/deployment.yaml`: Định nghĩa 5 backend deployments và frontend deployment kèm `containerPort` và biến môi trường.
  - `k8s/service.yaml`: Định nghĩa các Service TCP (cổng 4000, 5002, 5003, 5004, 5005) và Frontend LoadBalancer (cổng 3000).

### 8.2 Runtime Deployment Verification
- **Trạng thái**: **[C] NOT VERIFIED**
- **Lý do**: Kubernetes runtime deployment was not verified because no active Kubernetes cluster was available (`dial tcp [::1]:8080: connectex refused`). Không có cụm Kubernetes cục bộ hoặc từ xa nào đang kết nối.

---

## 9. Bugs Fixed (Tóm Tắt Các Lỗi Đã Khắc Phục)

1. **Price Tampering (Zero Server Authority)**: Khách hàng gửi giá giả mạo $\rightarrow$ Server tự query DB và ghi đè giá chính thức.
2. **Cross-User Data Leakage**: `GET /api/orders` rò rỉ đơn hàng $\rightarrow$ Ép buộc phạm vi truy vấn theo JWT role và user id.
3. **IDOR / BOLA**: Xem, sửa, hủy đơn hàng người khác $\rightarrow$ Chặn đứng với mã HTTP 403 Forbidden.
4. **Non-Integer & Negative Quantity**: Gửi `quantity: 0`, `-1`, `1.5` $\rightarrow$ Sử dụng `Number.isInteger(numQty) && numQty > 0`, từ chối với HTTP 400.
5. **JWT Token Inconsistency**: Cấu trúc token lệch chuẩn giữa các dịch vụ $\rightarrow$ Chuẩn hóa `{ id, role, email, name }`.
6. **Missing Pagination**: Danh sách lớn dùng `find({})` $\rightarrow$ Thêm phân trang `page` và `limit` (tối đa 50 bản ghi/trang).
7. **Payment Hijacking & Status Lookup**: Thanh toán hoặc tra cứu đơn người khác $\rightarrow$ Kiểm tra quyền sở hữu trong payment-service, từ chối với HTTP 403.
8. **Test Hanging trong Payment Service**: `server.js` tự mở cổng khi import $\rightarrow$ Bọc bằng `if (require.main === module)`.
9. **Frontend Undeclared Variable**: Lỗi `response is not defined` trong `OrderHome.js` $\rightarrow$ Bổ sung lời gọi `axios.get` đầy đủ.
10. **Docker Compose Obsolete Attribute**: Trường `version: '3.8'` sinh cảnh báo $\rightarrow$ Đã loại bỏ hoàn toàn.

---

## 10. Files Modified

1. `backend/auth-service/controllers/customerController.js`
2. `backend/auth-service/server.js`
3. `backend/restaurant-service/src/routes/restaurantRoutes.js`
4. `backend/restaurant-service/src/routes/foodItemRoutes.js`
5. `backend/restaurant-service/src/routes/searchRoutes.js`
6. `backend/order-service/middleware/authMiddleware.js`
7. `backend/order-service/models/foodItemModel.js`
8. `backend/order-service/models/couponModel.js`
9. `backend/order-service/models/orderModel.js`
10. `backend/order-service/services/orderService.js`
11. `backend/order-service/controllers/orderController.js`
12. `backend/order-service/routes/orderRoutes.js`
13. `backend/order-service/tests/order.test.js`
14. `delivery-service/backend/src/controllers/authController.js`
15. `delivery-service/backend/src/controllers/deliveryController.js`
16. `delivery-service/backend/src/middleware/authMiddleware.js`
17. `backend/payment-service/server.js`
18. `backend/payment-service/package.json`
19. `backend/payment-service/routes/paymentRoutes.js`
20. `backend/payment-service/services/paymentProviders/bankTransferProvider.js`
21. `backend/payment-service/tests/payment.test.js`
22. `frontend/src/pages/orderManagement/OrderHome.js`
23. `frontend/src/pages/orderManagement/Orders.js`
24. `docker-compose.yml`
25. `test-security-matrix.mjs`
26. `README.md`
27. `AUDIT_AND_FIX_REPORT.md`

---

## 11. Remaining Limitations

1. **Docker Runtime Unverified**: Tiến trình Docker Desktop daemon không chạy trên máy chủ Windows cục bộ trong quá trình kiểm toán, do đó việc build images và khởi chạy cụm container thực tế chưa được thực thi trực tiếp.
2. **Kubernetes Runtime Unverified**: Không có cụm Kubernetes cục bộ (Minikube / Docker Desktop K8s / Kind) khả dụng để kiểm tra việc cấp phát Pods, Services và Ingress trên runtime cluster.

---

## 12. Final Production Readiness Assessment

Application logic, security controls, automated tests and frontend production build have been verified successfully.

Docker Compose configuration has been validated, while Docker runtime deployment remains unverified due to the unavailable Docker daemon.

Kubernetes manifests have been statically verified, while Kubernetes runtime deployment remains unverified because no active cluster was available.
