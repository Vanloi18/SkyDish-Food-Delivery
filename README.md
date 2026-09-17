# 🍽️ SkyDish — Nền Tảng Giao Đồ Ăn Trực Tuyến Kiến Trúc Microservices

> **SkyDish Food Delivery Platform** là dự án nền tảng giao đồ ăn trực tuyến hiện đại, ứng dụng kiến trúc Microservices độc lập, hỗ trợ đa vai trò (Khách hàng, Nhà hàng, Shipper, Quản trị viên) và tích hợp đầy đủ 5 phương thức thanh toán phổ biến tại Việt Nam (VNPay, MoMo, VietQR, Stripe, COD).

---

## ⚡ HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN TỪ A ĐẾN Z

Bạn chỉ cần có sẵn **[Git](https://git-scm.com/)** và **[Docker Desktop](https://www.docker.com/products/docker-desktop/)** trên máy tính. **Không cần** cài đặt thủ công Node.js, npm hay MongoDB!

---

### 🟢 CÁCH 1: Chạy Tự Động 1-Click (Khuyên Dùng Cho Windows)

Trong thư mục dự án đã tích hợp sẵn script tự động hóa hoàn chỉnh:

1. **Clone mã nguồn về máy**:
   ```bash
   git clone https://github.com/Vanloi18/SkyDish-Food-Delivery.git
   cd SkyDish-Food-Delivery
   ```

2. **Khởi động 1-Click**:
   - Nhấp đúp chuột vào file **`START-SKYDISH.bat`** (hoặc mở CMD/PowerShell gõ `.\START-SKYDISH.bat`).
   - 🪄 **Script sẽ tự động làm hết mọi việc**:
     - Tự kiểm tra và khởi động Docker Desktop nếu chưa bật.
     - Tự động tạo file `.env` từ `.env.example` nếu chưa có.
     - Tự động build và kích hoạt toàn bộ 7 container microservices.
     - Tự động kiểm tra trạng thái sẵn sàng (Health check).
     - Tự động mở trình duyệt web đến trang chủ SkyDish (`http://localhost:3300`).

3. **Dừng hệ thống**:
   - Khi không sử dụng nữa, chỉ cần nhấp đúp file **`STOP-SKYDISH.bat`** (dữ liệu database vẫn được bảo lưu an toàn).

---

### 🔵 CÁCH 2: Chạy Bằng Lệnh Docker Compose (Windows, macOS, Linux)

Nếu bạn muốn thao tác trực tiếp qua dòng lệnh Terminal/PowerShell:

#### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/Vanloi18/SkyDish-Food-Delivery.git
cd SkyDish-Food-Delivery
```

#### Bước 2: Tạo file cấu hình môi trường `.env`
- Trên **Windows (Command Prompt / PowerShell)**:
  ```powershell
  copy .env.example .env
  ```
- Trên **macOS / Linux**:
  ```bash
  cp .env.example .env
  ```

#### Bước 3: Build và khởi chạy toàn bộ hệ thống
```bash
docker compose up -d --build
```
> *Lưu ý: Quá trình build lần đầu tiên sẽ mất khoảng 2 - 4 phút để tải base image và cài đặt thư viện cho các container.*

#### Bước 4: Mở trình duyệt và trải nghiệm
Truy cập ngay: **[http://localhost:3300](http://localhost:3300)**

---

## 🔑 DANH SÁCH TÀI KHOẢN DÙNG THỬ (DEMO READY)

Hệ thống đã tự động tạo sẵn dữ liệu mẫu (Seeded Data) bao gồm các tài khoản, nhà hàng, danh mục món ăn và mã giảm giá:

| Vai trò (Role) | Email đăng nhập | Mật khẩu mặc định | Đường dẫn trực tiếp | Mô tả chức năng |
| :--- | :--- | :--- | :--- | :--- |
| **Khách hàng** *(Customer)* | `customer@skydish.com` | `password123` | [http://localhost:3300/auth/login](http://localhost:3300/auth/login) | Xem thực đơn, thêm giỏ hàng, áp mã giảm giá, đặt món, chọn phương thức thanh toán, theo dõi đơn hàng thời gian thực. |
| **Đối tác Nhà hàng** *(Restaurant)* | `trangtien@pizza4ps.com` | `password123` | [http://localhost:3300/restaurant/login](http://localhost:3300/restaurant/login) | Quản lý thông tin quán, đăng/sửa món ăn, cập nhật giá, tạo mã giảm giá voucher, quản lý đơn hàng của quán. |
| **Tài xế Shipper** *(Driver)* | `driver@skydish.com` | `password123` | [http://localhost:3300/delivery/login](http://localhost:3300/delivery/login) | Nhận đơn hàng cần giao, cập nhật tiến trình đơn (Đã lấy món, Đang giao, Đã giao), cập nhật vị trí GPS. |
| **Quản trị viên** *(Super Admin)* | `admin@skydish.com` | `password123` | [http://localhost:3300/superadmin/login](http://localhost:3300/superadmin/login) | Bảng điều khiển tổng thể toàn sàn: quản lý tất cả nhà hàng, người dùng, tài xế, doanh thu, nhật ký hệ thống. |

---

## 🌐 BẢNG CỔNG & DỊCH VỤ HỆ THỐNG

Toàn bộ hệ thống chạy độc lập qua 7 container Docker:

| Tên Container | Dịch vụ (Service) | Cổng Host (Port) | Kiểm tra hoạt động (Health Check) | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- |
| `skydish-frontend` | **Frontend React** (Nginx) | `3300` | [http://localhost:3300](http://localhost:3300) | Giao diện Single-Page App, kiêm Reverse Proxy Gateway điều hướng API và Socket.IO |
| `skydish-auth-service` | **Auth Service** | `4000` | [http://localhost:4000/health](http://localhost:4000/health) | Đăng ký, đăng nhập, mã hóa bcrypt, cấp phát và xác thực JWT token |
| `skydish-restaurant-service` | **Restaurant Service** | `5002` | [http://localhost:5002/health](http://localhost:5002/health) | Quản lý danh mục nhà hàng, món ăn, tìm kiếm fuzzy search, upload ảnh, khuyến mãi, đánh giá |
| `skydish-delivery-service` | **Delivery Service** | `5003` | [http://localhost:5003/health](http://localhost:5003/health) | Điều phối giao hàng, quản lý shipper, theo dõi trạng thái giao vận thời gian thực |
| `skydish-payment-service` | **Payment Service** | `5004` | [http://localhost:5004/health](http://localhost:5004/health) | Xử lý thanh toán MoMo, VNPay, VietQR, Stripe, COD; xác thực chữ ký HMAC; Swagger `/api-docs` |
| `skydish-order-service` | **Order Service** | `5005` | [http://localhost:5005/health](http://localhost:5005/health) | Tính toán giá máy chủ (Anti-Tamper), tạo đơn hàng, quản lý vòng đời đơn, gửi email xác nhận |
| `skydish-mongo` | **MongoDB Database** | `27017` | `mongodb://localhost:27017` | Cơ sở dữ liệu NoSQL lưu trữ tập trung `food_delivery_db` |

---

## 🛠️ CÁC LỆNH DOCKER THƯỜNG DÙNG

```bash
# 1. Xem trạng thái các container đang chạy
docker compose ps

# 2. Xem logs trực tiếp của toàn bộ hệ thống
docker compose logs -f

# 3. Xem logs riêng của một dịch vụ cụ thể
docker compose logs -f payment-service
docker compose logs -f order-service

# 4. Tái khởi động lại một dịch vụ
docker compose restart restaurant-service

# 5. Nạp lại dữ liệu mẫu (Seeder) thủ công bất cứ lúc nào
docker compose exec restaurant-service node seed-all.mjs

# 6. Tắt toàn bộ hệ thống (dữ liệu database vẫn giữ nguyên)
docker compose down

# 7. Tắt và XÓA SẠCH dữ liệu database để khởi động lại từ đầu
docker compose down -v
```

---

## ❓ XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

### 1. Bị trùng cổng (Port already in use / `EADDRINUSE`)
- **Nguyên nhân**: Cổng `3300`, `4000`, `5002`, `5003`, `5004`, `5005` hoặc `27017` đang bị chiếm bởi một ứng dụng khác trên máy bạn.
- **Cách khắc phục**:
  - Mở file `.env` và đổi sang cổng khác. Ví dụ: `FRONTEND_PORT=3301`
  - Hoặc trên Windows nếu do dịch vụ mạng WinNAT chiếm dải port, mở CMD quyền Admin chạy:
    ```cmd
    net stop winnat && net start winnat
    ```

### 2. Docker Engine không phản hồi / Chưa mở Docker Desktop
- **Cách khắc phục**: Bật ứng dụng **Docker Desktop** lên. Hãy đợi vài chục giây cho đến khi biểu tượng chú cá voi chuyển sang **màu xanh lá cây (Engine running)** trước khi chạy lệnh khởi động.

### 3. Khách hàng chưa đăng nhập không thể đặt hàng (Guest Protection)
- **Cơ chế an toàn**: Để đảm bảo tính chính xác cho việc giao đồ ăn và gửi email hóa đơn, hệ thống yêu cầu khách hàng đăng nhập tài khoản trước khi tiến hành thanh toán tại trang Checkout. Bạn chỉ cần bấm "Đăng nhập ngay" và sử dụng tài khoản `customer@skydish.com` / `password123`.

---

## 🏗️ KIẾN TRÚC & TÍNH NĂNG NỔI BẬT

### 1. Sơ đồ luồng hoạt động Microservices

```
                 Khách Hàng   •   Nhà Hàng Đối Tác   •   Tài Xế Shipper   •   Quản Trị Viên
                                            │
                                            ▼
                                  ┌───────────────────┐
                                  │   React Frontend  │
                                  │    (Port 3300)    │
                                  └─────────┬─────────┘
                                            │  Nginx Reverse Proxy Gateway
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

### 2. Tích hợp 5 Cổng Thanh Toán Chuẩn Việt Nam & Quốc Tế
1. **MoMo (Ví điện tử)**: Tích hợp MoMo API v2 (`captureWallet`), kiểm tra tính toàn vẹn chữ ký số HMAC-SHA256, hỗ trợ cả Callback URL và IPN Server-to-Server Webhook.
2. **VNPay**: Tạo URL thanh toán bảo mật với mã băm chữ ký kiểm tra HMAC-SHA512, đồng bộ trạng thái đơn hàng tự động sau khi thanh toán.
3. **VietQR / Chuyển khoản ngân hàng**: Tự động sinh mã QR VietQR chuẩn ngân hàng MB Bank kèm nội dung chuyển khoản tự động nhận diện theo mã đơn hàng (`SKYDISH-<orderId>`).
4. **Stripe (Thẻ quốc tế Visa/Mastercard)**: Tích hợp Stripe PaymentIntent, mã hóa an toàn đạt chuẩn PCI-DSS.
5. **Tiền mặt (COD)**: Cho phép khách nhận đồ ăn rồi mới thanh toán, tự động đồng bộ sang dịch vụ giao vận shipper.

### 3. Tính Giá An Toàn Phía Máy Chủ (Server-Side Authoritative Pricing)
- Khách hàng không thể can thiệp hay sửa đổi giá món ăn từ phía trình duyệt.
- Dịch vụ Order Service truy vấn giá món ăn trực tiếp từ cơ sở dữ liệu MongoDB và tự động tính toán lại tổng tiền, phí vận chuyển và mức chiết khấu của voucher hợp lệ.

### 4. Gửi Email Xác Nhận Đơn Hàng Tự Động
- Tích hợp dịch vụ gửi email hóa đơn HTML chuyên nghiệp qua giao thức SMTP.
- Cơ chế Idempotency đảm bảo không gửi trùng lặp email cho cùng một đơn hàng.
- Xử lý bất đồng bộ, lỗi mạng từ dịch vụ gửi email không làm ảnh hưởng đến quá trình thanh toán và tạo đơn.

---

## 🧪 KIỂM THỬ TỰ ĐỘNG & BẢO MẬT (TEST MATRIX)

Hệ thống đi kèm bộ kiểm thử tự động toàn diện bao quát tất cả các kịch bản:

```bash
# Chạy bộ test kiểm tra quy trình MoMo Sandbox & bảo mật chữ ký số
docker compose exec payment-service node tests/momo.test.js

# Chạy bộ test kiểm tra bảo vệ đơn hàng khách vãng lai & gửi email
node scripts/test-guest-order-and-email.mjs

# Chạy kiểm tra đồng bộ trạng thái đơn hàng giữa Delivery và Order Service
node scripts/test-delivery-order-sync.mjs

# Quét phát hiện lộ lọt Secrets / API Keys trong mã nguồn
node scripts/scan-secrets.mjs
```

---

## 💻 CHẠY TRỰC TIẾP KHÔNG DÙNG DOCKER (HOST DEVELOPMENT)

Nếu bạn muốn chạy từng dịch vụ trực tiếp trên máy chủ bằng Node.js và MongoDB cục bộ:

1. **Cài đặt dependencies cho từng dịch vụ**:
   ```bash
   cd backend/auth-service && npm install && cd ../..
   cd backend/restaurant-service && npm install && cd ../..
   cd backend/order-service && npm install && cd ../..
   cd backend/payment-service && npm install && cd ../..
   cd delivery-service/backend && npm install && cd ../..
   cd frontend && npm install && cd ..
   ```

2. **Cấu hình `.env`**:
   Đặt `MONGO_URI=mongodb://127.0.0.1:27017/food_delivery_db`.

3. **Chạy các dịch vụ**:
   Bạn có thể mở từng terminal để chạy `npm start` cho từng thư mục, hoặc sử dụng file batch có sẵn:
   ```cmd
   start-all.bat
   ```

---

## 📄 Bản Quyền & Tác Giả

Dự án **SkyDish Food Delivery Platform** được phát triển và duy trì bởi **[Vanloi18](https://github.com/Vanloi18)**. Mọi quyền được bảo lưu.
