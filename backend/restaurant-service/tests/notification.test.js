import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Notification from '../src/models/Notification.js';
import notificationRoutes from '../src/routes/notificationRoutes.js';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';
const testId = `notification-test-${Date.now()}`;
const entityIds = [`${testId}-customer`, `${testId}-delivery`];
let server;
let baseUrl;

const createToken = (id, role) => jwt.sign({ id, role }, process.env.JWT_SECRET);

const request = (path, token, options = {}) => fetch(`${baseUrl}${path}`, {
  ...options,
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...options.headers,
  },
});

describe('Notification role inbox', () => {
  before(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'notification-route-test-secret';
    await mongoose.connect(mongoUri);

    const app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once('listening', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://127.0.0.1:${server.address().port}/api/notifications`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    await Notification.deleteMany({ entityId: { $in: entityIds } });
    await mongoose.disconnect();
  });

  it('scopes notifications by role and user, denies user creation, and tracks broadcast reads per driver', async () => {
    const adminToken = createToken(`${testId}-admin`, 'superAdmin');
    const customerToken = createToken(`${testId}-customer`, 'customer');
    const otherCustomerToken = createToken(`${testId}-other-customer`, 'customer');
    const firstDriverToken = createToken(`${testId}-driver-1`, 'driver');
    const secondDriverToken = createToken(`${testId}-driver-2`, 'driver');

    const customerNotification = await request('/create', adminToken, {
      method: 'POST',
      body: JSON.stringify({
        userId: `${testId}-customer`,
        role: 'customer',
        title: 'Đã nhận đơn',
        message: 'Đơn hàng đang chờ xác nhận.',
        entityType: 'order',
        entityId: entityIds[0],
      }),
    });
    assert.equal(customerNotification.status, 201);

    const deniedCreate = await request('/create', customerToken, {
      method: 'POST',
      body: JSON.stringify({
        userId: `${testId}-customer`,
        role: 'customer',
        title: 'Giả mạo',
        message: 'Không được phép tạo.',
      }),
    });
    assert.equal(deniedCreate.status, 403);

    const customerInbox = await (await request('', customerToken)).json();
    assert.equal(customerInbox.notifications.length, 1);
    const otherCustomerInbox = await (await request('', otherCustomerToken)).json();
    assert.equal(otherCustomerInbox.notifications.length, 0);

    const broadcast = await request('/create', adminToken, {
      method: 'POST',
      body: JSON.stringify({
        userId: 'all',
        role: 'delivery',
        title: 'Có đơn mới',
        message: 'Đơn hàng sẵn sàng nhận giao.',
        entityType: 'order',
        entityId: entityIds[1],
      }),
    });
    assert.equal(broadcast.status, 201);

    const firstDriverInbox = await (await request('', firstDriverToken)).json();
    const broadcastNotification = firstDriverInbox.notifications[0];
    assert.equal(firstDriverInbox.unreadCount, 1);
    assert.equal((await request(`/${broadcastNotification._id}/read`, firstDriverToken, { method: 'PUT' })).status, 200);

    const secondDriverInbox = await (await request('', secondDriverToken)).json();
    const firstDriverAfterRead = await (await request('', firstDriverToken)).json();
    assert.equal(secondDriverInbox.unreadCount, 1);
    assert.equal(firstDriverAfterRead.unreadCount, 0);
  });
});
