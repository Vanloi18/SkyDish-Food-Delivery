import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import Driver from '../src/models/Driver.js';
import Delivery from '../src/models/Delivery.js';
import Notification from '../src/models/Notification.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';

describe('Comprehensive SkyDish Delivery & Driver Test Suite', () => {
  let server;
  let baseUrl;
  let driverA, driverB, testAdmin;
  let tokenDriverA, tokenDriverB, tokenAdmin;
  let createdDeliveryId;
  const ts = Date.now();

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Khởi chạy HTTP server trên port động (port 0)
    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });

    // Tạo Driver A mẫu
    driverA = await Driver.create({
      name: 'Nguyễn Văn Driver Suite A',
      email: `driver_suite_a_${ts}@skydish.com`,
      password: 'password123',
      phone: `0933${String(ts).slice(-6)}`,
      vehicleType: 'bike',
      vehicleNumber: `29C-${String(ts).slice(-5)}`,
      status: 'available',
      location: { type: 'Point', coordinates: [105.85, 21.02] }
    });
    tokenDriverA = jwt.sign({ id: driverA._id.toString(), role: 'driver', name: driverA.name }, JWT_SECRET, { expiresIn: '1h' });

    // Tạo Driver B mẫu
    driverB = await Driver.create({
      name: 'Trần Văn Driver Suite B',
      email: `driver_suite_b_${ts}@skydish.com`,
      password: 'password123',
      phone: `0944${String(ts).slice(-6)}`,
      vehicleType: 'car',
      vehicleNumber: `29D-${String(ts).slice(-5)}`,
      status: 'offline',
      location: { type: 'Point', coordinates: [105.86, 21.03] }
    });
    tokenDriverB = jwt.sign({ id: driverB._id.toString(), role: 'driver', name: driverB.name }, JWT_SECRET, { expiresIn: '1h' });

    // Tạo Admin token
    tokenAdmin = jwt.sign({ id: `admin_${ts}`, role: 'admin', name: 'Super Admin' }, JWT_SECRET, { expiresIn: '1h' });
  });

  after(async () => {
    // Dọn dẹp dữ liệu test
    if (driverA) await Driver.findByIdAndDelete(driverA._id);
    if (driverB) await Driver.findByIdAndDelete(driverB._id);
    if (createdDeliveryId) await Delivery.findByIdAndDelete(createdDeliveryId);
    await Delivery.deleteMany({ orderId: new RegExp(`ORDER_SUITE_${ts}`) });
    await Notification.deleteMany({ entityId: createdDeliveryId });

    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await mongoose.disconnect();
  });

  // =========================================================================
  // GROUP 1: DRIVER AUTHENTICATION, STATUS & PROFILE
  // =========================================================================
  describe('Group 1: Driver Authentication & Profile Management', () => {
    it('1.1 Đăng ký tài xế mới thành công trả về token và thông tin hợp lệ', async () => {
      const uniqueSuffix = Date.now() + 1;
      const res = await fetch(`${baseUrl}/api/delivery/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Lê Văn Mới',
          email: `driver_new_${uniqueSuffix}@skydish.com`,
          password: 'password123',
          phone: `0955${String(uniqueSuffix).slice(-6)}`,
          vehicleType: 'bike',
          vehicleNumber: `29E-${String(uniqueSuffix).slice(-5)}`
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.data.name, 'Lê Văn Mới');

      // Dọn dẹp
      if (data.data?.id) await Driver.findByIdAndDelete(data.data.id);
    });

    it('1.2 Từ chối đăng ký khi trùng email', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Trùng Email',
          email: driverA.email,
          password: 'password123',
          phone: '0999888777',
          vehicleType: 'bike',
          vehicleNumber: '29X-99999'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 409);
      assert.strictEqual(data.success, false);
    });

    it('1.3 Đăng nhập tài xế thành công với thông tin chính xác', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: driverA.email,
          password: 'password123'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(data.token);
      assert.strictEqual(data.data.email, driverA.email);
    });

    it('1.4 Đăng nhập thất bại khi sai mật khẩu', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: driverA.email,
          password: 'wrongpassword'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 401);
      assert.strictEqual(data.success, false);
    });

    it('1.5 Lấy profile tài xế trả về đầy đủ cả driver và data', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/auth/profile`, {
        headers: { 'Authorization': `Bearer ${tokenDriverA}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(data.driver);
      assert.strictEqual(data.driver.email, driverA.email);
    });

    it('1.6 Tài xế tự cập nhật trạng thái làm việc (Online/Offline)', async () => {
      // Chuyển sang offline
      const res1 = await fetch(`${baseUrl}/api/delivery/drivers/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverA}`
        },
        body: JSON.stringify({ status: 'offline' })
      });
      const data1 = await res1.json();
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(data1.status, 'offline');
      assert.strictEqual(data1.isAvailable, false);

      // Chuyển lại sang available
      const res2 = await fetch(`${baseUrl}/api/delivery/drivers/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverA}`
        },
        body: JSON.stringify({ status: 'available' })
      });
      const data2 = await res2.json();
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(data2.status, 'available');
      assert.strictEqual(data2.isAvailable, true);
    });
  });

  // =========================================================================
  // GROUP 2: ADMIN DRIVER CRUD
  // =========================================================================
  describe('Group 2: Admin Driver Management (CRUD)', () => {
    it('2.1 Admin lấy danh sách toàn bộ tài xế kèm phân trang và filter', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/drivers?page=1&limit=5&status=available`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(Array.isArray(data.drivers));
      assert.ok(data.pagination);
    });

    it('2.2 Tài xế không có quyền Admin bị từ chối truy cập danh sách toàn bộ tài xế (403)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/drivers`, {
        headers: { 'Authorization': `Bearer ${tokenDriverA}` }
      });
      assert.strictEqual(res.status, 403);
    });

    it('2.3 Lấy thông tin chi tiết một tài xế theo ID', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/drivers/${driverA._id}`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.driver._id, driverA._id.toString());
    });
  });

  // =========================================================================
  // GROUP 3: DELIVERY LIFECYCLE, STATUS, ASSIGNMENT & DB SYNC
  // =========================================================================
  describe('Group 3: Delivery Service Lifecycle & Driver Assignment', () => {
    it('3.1 Tạo chuyến giao hàng mới thành công (gắn với Driver A)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverA}`
        },
        body: JSON.stringify({
          orderId: `ORDER_SUITE_${ts}`,
          customerId: 'Khách hàng Test Suite',
          pickupAddress: '120 Phố Huế, Hai Bà Trưng, Hà Nội',
          deliveryAddress: '45 Lê Lợi, Hoàn Kiếm, Hà Nội',
          driverId: driverA._id.toString()
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 201);
      assert.strictEqual(data.success, true);
      assert.ok(data.delivery._id);
      createdDeliveryId = data.delivery._id;
    });

    it('3.2 Tra cứu đơn giao hàng theo Order ID', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/order/ORDER_SUITE_${ts}`, {
        headers: { 'Authorization': `Bearer ${tokenDriverA}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.delivery.orderId, `ORDER_SUITE_${ts}`);
    });

    it('3.3 Điều phối gán lại tài xế sang Driver B', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({ driverId: driverB._id.toString() })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.delivery.driver.toString(), driverB._id.toString());

      // Kiểm tra Driver B chuyển sang on-delivery
      const updatedDriverB = await Driver.findById(driverB._id);
      assert.strictEqual(updatedDriverB.status, 'on-delivery');
    });

    it('3.4 Driver B cập nhật trạng thái đơn thành Picked-up', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverB}`
        },
        body: JSON.stringify({ status: 'Picked-up' })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.delivery.status, 'Picked-up');
    });

    it('3.5 Driver A không có quyền cập nhật trạng thái đơn của Driver B (403)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverA}`
        },
        body: JSON.stringify({ status: 'Delivered' })
      });
      assert.strictEqual(res.status, 403);
    });

    it('3.6 Driver B hoàn thành đơn (Delivered): tự động giải phóng tài xế về available', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverB}`
        },
        body: JSON.stringify({ status: 'Delivered' })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.delivery.status, 'Delivered');

      // Kiểm tra Driver B tự động được cập nhật về 'available'
      const freedDriver = await Driver.findById(driverB._id);
      assert.strictEqual(freedDriver.status, 'available');
    });

    it('3.7 Admin có quyền xem toàn bộ đơn giao hàng (all=true)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery?all=true`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.ok(data.deliveries.length >= 1);
    });
  });

  // =========================================================================
  // GROUP 4: NOTIFICATIONS & STATISTICS
  // =========================================================================
  describe('Group 4: Notifications & Reporting / Statistics', () => {
    it('4.1 Kiểm tra thông báo Notification đã được sinh ra trong MongoDB', async () => {
      const notifications = await Notification.find({ entityId: createdDeliveryId });
      assert.ok(notifications.length >= 1, 'Phải có ít nhất 1 thông báo cho chuyến giao hàng này');
      const hasDeliveredNotif = notifications.some(n => n.title.includes('Hoàn tất') || n.title.includes('thành công'));
      assert.ok(hasDeliveredNotif, 'Phải có thông báo giao hàng thành công');
    });

    it('4.2 Admin lấy số liệu thống kê tổng quan (overview stats)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/statistics/overview`, {
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.ok(data.deliveries.total >= 1);
      assert.ok(data.deliveries.statusBreakdown);
      assert.ok(data.drivers.total >= 2);
      assert.ok(data.deliveries.completionRate);
    });

    it('4.3 Tài xế lấy số liệu hiệu suất cá nhân (driver stats)', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/statistics/driver`, {
        headers: { 'Authorization': `Bearer ${tokenDriverB}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.driverId, driverB._id.toString());
      assert.ok(data.stats.totalAssigned >= 1);
      assert.ok(data.stats.completedCount >= 1);
    });
  });

  // =========================================================================
  // GROUP 5: ERROR HANDLING & VALIDATION
  // =========================================================================
  describe('Group 5: Error Handling & Security Validations', () => {
    it('5.1 Từ chối tạo chuyến giao khi thiếu trường bắt buộc', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenDriverA}`
        },
        body: JSON.stringify({
          orderId: 'INCOMPLETE_ORDER'
        })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
    });

    it('5.2 Từ chối truy cập khi không có Authorization token', async () => {
      const res = await fetch(`${baseUrl}/api/delivery`, {
        method: 'GET'
      });
      assert.strictEqual(res.status, 401);
    });

    it('5.3 Từ chối cập nhật trạng thái không hợp lệ', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokenAdmin}`
        },
        body: JSON.stringify({ status: 'InvalidStatusString' })
      });
      const data = await res.json();
      assert.strictEqual(res.status, 400);
      assert.strictEqual(data.success, false);
    });

    it('5.4 Xóa đơn giao hàng đã hoàn thành (Delivered) thành công', async () => {
      const res = await fetch(`${baseUrl}/api/delivery/${createdDeliveryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenAdmin}` }
      });
      const data = await res.json();
      assert.strictEqual(res.status, 200);
      assert.strictEqual(data.success, true);
    });
  });
});
