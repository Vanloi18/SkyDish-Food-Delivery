# 📦 TÀI LIỆU KỸ THUẬT DỊCH VỤ GIAO VẬN & TÀI XẾ (DELIVERY SERVICE)
**Dự án:** SkyDish Food Delivery Platform (Kiến trúc Microservices)  
**Tác giả phụ trách:** Lê Phương Anh  
**Cổng dịch vụ:** Port `5003` (Proxy qua Nginx Frontend: `http://localhost:3300/api/delivery`)  
**WebSocket:** Socket.IO path `/delivery-socket.io`  

WebSocket clients must send a valid driver or customer JWT in the Socket.IO `auth.token` field. The server joins the private recipient room using the verified token subject; clients cannot choose another user's room ID.

---

## 📌 1. TỔNG QUAN KIẾN TRÚC & PHÂN QUYỀN

Dịch vụ Delivery Service quản lý toàn bộ vòng đời điều phối đơn giao hàng, đội ngũ tài xế shipper, thông báo giao vận và báo cáo thống kê.

### Các vai trò người dùng (Roles & RBAC)
- **Quản trị viên (`admin` / `superadmin`)**: Toàn quyền xem và điều phối mọi đơn giao hàng, xem và quản lý danh sách tài xế, xem báo cáo thống kê tổng thể toàn hệ thống.
- **Tài xế (`driver`)**: Nhận đơn, xem các đơn được gán cho bản thân, cập nhật trạng thái đơn hàng (`Picked-up`, `Delivered`), bật/tắt trạng thái hoạt động trực tuyến/ngoại tuyến (`available` / `offline`), xem thống kê hiệu suất cá nhân.
- **Khách hàng (`customer`)**: Theo dõi lộ trình và chi tiết đơn giao theo mã đơn hàng (`orderId`), nhận thông báo tiến trình giao đồ ăn thời gian thực.

---

## 🚀 2. DANH MỤC API CHI TIẾT

### 2.1. Nhóm Xác Thực & Hồ Sơ Tài Xế (Driver Auth & Profile)

#### `POST /api/delivery/auth/register` (hoặc `/api/auth/register`)
- **Mô tả**: Đăng ký tài khoản tài xế đối tác mới.
- **Quyền**: Public.
- **Request Body**:
```json
{
  "name": "Nguyễn Văn Shipper",
  "email": "driver@skydish.com",
  "password": "password123",
  "phone": "0901234567",
  "vehicleType": "bike",
  "vehicleNumber": "29A-888.99"
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "66d3a1...",
    "name": "Nguyễn Văn Shipper",
    "email": "driver@skydish.com",
    "vehicleType": "bike",
    "vehicleNumber": "29A-888.99",
    "status": "available"
  }
}
```

#### `POST /api/delivery/auth/login` (hoặc `/api/auth/login`)
- **Mô tả**: Đăng nhập tài xế, trả về mã xác thực JWT.
- **Quyền**: Public.
- **Request Body**:
```json
{
  "email": "driver@skydish.com",
  "password": "password123"
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "data": {
    "id": "66d3a1...",
    "name": "Nguyễn Văn Shipper",
    "email": "driver@skydish.com",
    "vehicleType": "bike",
    "status": "available"
  }
}
```

#### `GET /api/delivery/auth/profile`
- **Mô tả**: Xem thông tin hồ sơ tài xế đang đăng nhập.
- **Quyền**: `driver`.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
```json
{
  "success": true,
  "driver": {
    "_id": "66d3a1...",
    "name": "Nguyễn Văn Shipper",
    "email": "driver@skydish.com",
    "phone": "0901234567",
    "vehicleType": "bike",
    "vehicleNumber": "29A-888.99",
    "status": "available",
    "isAvailable": true
  },
  "data": { ... }
}
```

---

### 2.2. Nhóm Quản Lý Tài Xế (Driver Management)

#### `GET /api/delivery/drivers`
- **Mô tả**: Lấy danh sách toàn bộ tài xế (có phân trang, tìm kiếm và lọc).
- **Quyền**: `admin`, `superadmin`.
- **Query Params**:
  - `page`: Số trang (mặc định: 1)
  - `limit`: Số dòng mỗi trang (mặc định: 10, tối đa: 100)
  - `status`: Lọc theo trạng thái (`available`, `on-delivery`, `offline`)
  - `search`: Từ khóa tìm kiếm (họ tên, email, sđt, biển số)
- **Response `200 OK`**:
```json
{
  "success": true,
  "drivers": [
    {
      "_id": "66d3a1...",
      "name": "Nguyễn Văn Shipper",
      "email": "driver@skydish.com",
      "phone": "0901234567",
      "vehicleType": "bike",
      "vehicleNumber": "29A-888.99",
      "status": "available",
      "isAvailable": true
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalItems": 25,
    "limit": 10
  }
}
```

#### `GET /api/delivery/drivers/:id`
- **Mô tả**: Lấy thông tin chi tiết một tài xế theo ID.
- **Quyền**: `admin`, `driver`.

#### `PUT /api/delivery/drivers/status` (hoặc `PATCH /status`, `/auth/status`)
- **Mô tả**: Tài xế tự bật/tắt trạng thái trực tuyến / ngoại tuyến.
- **Quyền**: `driver` (hoặc `admin`).
- **Request Body**:
```json
{
  "status": "available" // hoặc "offline"
}
```
hoặc:
```json
{
  "isAvailable": true // hoặc false
}
```
- **Response `200 OK`**:
```json
{
  "success": true,
  "message": "Cập nhật trạng thái tài xế thành 'available' thành công!",
  "status": "available",
  "isAvailable": true
}
```

#### `PUT /api/delivery/drivers/profile` (hoặc `PUT /api/delivery/drivers/:id`)
- **Mô tả**: Cập nhật thông tin hồ sơ tài xế (họ tên, số điện thoại, phương tiện, biển số).
- **Quyền**: `driver` (tự sửa) hoặc `admin`.

#### `DELETE /api/delivery/drivers/:id`
- **Mô tả**: Xóa tài xế khỏi hệ thống.
- **Quyền**: `admin`, `superadmin`.
- **Ràng buộc**: Không thể xóa tài xế đang trong chuyến giao dở (`on-delivery`).

---

### 2.3. Nhóm Điều Phối Giao Hàng (Delivery Service Core)

#### `POST /api/delivery/create`
- **Mô tả**: Tạo chuyến giao hàng mới. Tự động geocode tọa độ địa chỉ đón và giao, tự động phát sinh thông báo (Notification) và bắn Socket realtime.
- **Quyền**: `driver`, `customer`, `admin`.
- **Request Body**:
```json
{
  "orderId": "66d3b45...",
  "customerId": "customer@skydish.com",
  "pickupAddress": "120 Phố Huế, Hai Bà Trưng, Hà Nội",
  "deliveryAddress": "45 Lê Lợi, Hoàn Kiếm, Hà Nội",
  "driverId": "66d3a1...", // Tùy chọn: chỉ định tài xế
  "autoAssign": true       // Tùy chọn: tự động tìm tài xế gần nhất
}
```
- **Response `201 Created`**:
```json
{
  "success": true,
  "message": "Delivery created successfully!",
  "delivery": {
    "_id": "66d3c7...",
    "driver": "66d3a1...",
    "orderId": "66d3b45...",
    "customerId": "customer@skydish.com",
    "pickupAddress": "120 Phố Huế, Hai Bà Trưng, Hà Nội",
    "deliveryAddress": "45 Lê Lợi, Hoàn Kiếm, Hà Nội",
    "status": "assigned",
    "createdAt": "2026-10-01T01:50:00.000Z"
  }
}
```

#### `GET /api/delivery`
- **Mô tả**:
  - Với **Tài xế**: Trả về các chuyến giao được phân công cho tài xế đó.
  - Với **Quản trị viên (Admin)** hoặc khi truyền query `?all=true`: Trả về toàn bộ các chuyến giao trong hệ thống.
- **Query Params**:
  - `page`, `limit`
  - `status`: Lọc theo `assigned`, `To be delivered`, `Picked-up`, `Delivered`
  - `search`: Tìm theo mã đơn, email khách hàng, địa chỉ
  - `driverId`: Lọc theo tài xế cụ thể

#### `GET /api/delivery/:id`
- **Mô tả**: Lấy chi tiết chuyến giao hàng kèm thông tin tài xế và tọa độ GeoJSON.
- **Quyền**: Driver được gán, Customer tạo đơn, hoặc Admin.

#### `GET /api/delivery/order/:orderId`
- **Mô tả**: Tra cứu thông tin giao vận theo mã đơn hàng (`orderId`).
- **Quyền**: Authenticated users.

#### `GET /api/delivery/driver/:driverId`
- **Mô tả**: Xem danh sách các chuyến giao của một tài xế cụ thể.
- **Quyền**: Admin hoặc chính tài xế đó.

#### `PUT /api/delivery/:id/status`
- **Mô tả**: Cập nhật tiến trình chuyến giao (`Picked-up`, `To be delivered`, `Delivered`).
  - Tự động đồng bộ trạng thái đơn hàng sang collection `orders` (`Out for Delivery`, `Delivered`).
  - Khi đơn hàng hoàn thành (`Delivered`), hệ thống tự động giải phóng tài xế từ `on-delivery` trở về lại `available`.
  - Tự động ghi nhận bản ghi Notification cho khách hàng và tài xế.
- **Quyền**: Driver được gán hoặc Admin.
- **Request Body**:
```json
{
  "status": "Picked-up" // hoặc "To be delivered", "Delivered"
}
```

#### `PUT /api/delivery/:id/assign` (hoặc `POST /assign`)
- **Mô tả**: Điều phối / Gán tài xế cho đơn giao hàng.
- **Quyền**: `admin`, `superadmin`.
- **Request Body**:
```json
{
  "driverId": "66d3a1..." // hoặc "autoAssign": true
}
```

#### `DELETE /api/delivery/:id`
- **Mô tả**: Xóa chuyến giao hàng.
- **Quyền**: Driver được gán hoặc Admin (Chỉ xóa được khi đơn đã `Delivered` hoặc Admin force delete).

---

### 2.4. Nhóm Báo Cáo & Thống Kê (Report / Statistics)

#### `GET /api/delivery/statistics/overview`
- **Mô tả**: Thống kê số liệu toàn diện cho Admin Dashboard.
- **Quyền**: `admin`, `superadmin`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "timestamp": "2026-10-01T01:50:00.000Z",
  "deliveries": {
    "total": 128,
    "completionRate": "88%",
    "statusBreakdown": {
      "assigned": 5,
      "pickedUp": 7,
      "toBeDelivered": 3,
      "delivered": 113
    },
    "timeBreakdown": {
      "today": 14,
      "last7Days": 68,
      "last30Days": 128
    }
  },
  "drivers": {
    "total": 18,
    "available": 10,
    "onDelivery": 6,
    "offline": 2,
    "topPerformers": [
      {
        "driverId": "66d3a1...",
        "driverName": "Nguyễn Văn Shipper",
        "phone": "0901234567",
        "vehicleNumber": "29A-888.99",
        "completedCount": 42
      }
    ]
  }
}
```

#### `GET /api/delivery/statistics/driver`
- **Mô tả**: Thống kê hiệu suất làm việc của tài xế đang đăng nhập.
- **Quyền**: `driver`.
- **Response `200 OK`**:
```json
{
  "success": true,
  "driverId": "66d3a1...",
  "stats": {
    "totalAssigned": 45,
    "completedCount": 42,
    "todayCompleted": 6,
    "inProgressCount": 1
  }
}
```

---

## 🔔 3. HỆ THỐNG THÔNG BÁO (NOTIFICATION INTEGRATION)

Dịch vụ kết nối trực tiếp vào MongoDB collection `notifications` dùng chung trong hệ thống SkyDish:
1. **Khi chuyến giao được tạo**:
   - Gửi thông báo đến Customer: *"Đơn giao hàng mới đã được khởi tạo"*.
   - Gửi thông báo đến Driver (nếu đã phân công): *"Bạn có đơn giao hàng mới!"*.
2. **Khi gán tài xế**:
   - Gửi thông báo đến Driver: *"Đơn giao hàng mới được gán cho bạn"*.
   - Gửi thông báo đến Customer: *"Tài xế [Tên] đã nhận đơn và chuẩn bị lấy hàng"*.
3. **Khi trạng thái thay đổi**:
   - Trạng thái `Picked-up`: *"Tài xế đã lấy món ăn từ nhà hàng và đang trên đường giao tới bạn"*.
   - Trạng thái `Delivered`: *"Đơn hàng đã được giao thành công! Chúc bạn bữa ăn ngon miệng cùng SkyDish"*.
   - Thông báo cho Driver: *"Chúc mừng bạn đã hoàn thành giao đơn hàng!"*.

---

## 🧪 4. HƯỚNG DẪN KIỂM THỬ (TESTING)

Trong thư mục `delivery-service/backend`, chạy:
```bash
npm test
```
Lệnh trên tự động kích hoạt cả hai bộ kiểm thử:
1. `tests/delivery.test.js`: Bộ test hồi quy gốc (5 tests).
2. `tests/driver_and_delivery_suite.test.js`: Bộ test toàn diện mở rộng mới (18 tests).
