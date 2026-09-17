import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Delivery from '../src/models/Delivery.js';
import Driver from '../src/models/Driver.js';
import { createDelivery, DELIVERY_TRANSITIONS, updateDeliveryStatus } from '../src/controllers/deliveryController.js';
import authMiddleware, { authorizeRoles } from '../src/middleware/authMiddleware.js';

const runMiddleware = (middleware, req) => new Promise((resolve) => {
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; resolve({ next: false, res: this }); }
  };
  middleware(req, res, () => resolve({ next: true, req, res }));
});

const invoke = async (handler, req) => {
  const result = { statusCode: 200, body: null };
  const res = {
    status(code) { result.statusCode = code; return this; },
    json(body) { result.body = body; return this; }
  };
  await handler(req, res);
  return result;
};

describe('Delivery assignment and driver authorization invariants', () => {
  it('enforces one delivery document per order at schema/index level', () => {
    assert.equal(Delivery.schema.path('orderId').options.unique, true);
  });

  it('allows only the sequential delivery lifecycle', () => {
    assert.deepEqual(DELIVERY_TRANSITIONS, {
      assigned: ['To be delivered'],
      'To be delivered': ['Picked-up'],
      'Picked-up': ['Delivered'],
      Delivered: []
    });
  });

  it('does not upgrade a role-less token into a driver', async () => {
    process.env.JWT_SECRET = 'delivery-test-secret';
    const token = jwt.sign({ id: '65f010101010101010101001' }, process.env.JWT_SECRET);
    const authenticated = await runMiddleware(authMiddleware, { header: () => `Bearer ${token}` });
    assert.equal(authenticated.next, true);
    const authorized = await runMiddleware(authorizeRoles('driver'), authenticated.req);
    assert.equal(authorized.next, false);
    assert.equal(authorized.res.statusCode, 403);
  });

  it('allows an authenticated driver through driver-only authorization', async () => {
    const authorized = await runMiddleware(authorizeRoles('driver'), { role: 'driver' });
    assert.equal(authorized.next, true);
  });
});

describe('Delivery claim race and Order synchronization', () => {
  const createdDriverIds = [];
  let orderId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db');
    }
    await Delivery.syncIndexes();
    orderId = new mongoose.Types.ObjectId();
    await mongoose.connection.db.collection('orders').insertOne({
      _id: orderId,
      customerId: 'customer-race-test',
      restaurantId: 'restaurant-race-test',
      restaurantName: 'Race Test Kitchen',
      deliveryAddress: '1 Test Street, Ha Noi',
      status: 'Preparing',
      paymentStatus: 'Pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    for (const suffix of ['A', 'B']) {
      const driver = await Driver.create({
        name: `Race Driver ${suffix}`,
        email: `race-${suffix}-${Date.now()}@example.com`,
        password: 'password123',
        phone: `09${suffix === 'A' ? '31' : '32'}${String(Date.now()).slice(-6)}`,
        vehicleType: 'bike',
        vehicleNumber: `RACE-${suffix}-${String(Date.now()).slice(-4)}`
      });
      createdDriverIds.push(driver._id);
    }
  });

  after(async () => {
    await Delivery.deleteMany({ orderId: orderId.toString() });
    await Driver.deleteMany({ _id: { $in: createdDriverIds } });
    await mongoose.connection.db.collection('orders').deleteOne({ _id: orderId });
    await mongoose.disconnect();
  });

  it('allows exactly one of two concurrent drivers to claim an order', async () => {
    const requests = createdDriverIds.map((driverId) => invoke(createDelivery, {
      body: { orderId: orderId.toString(), pickupAddress: 'Race Test Kitchen, Ha Noi' },
      driver: driverId.toString(),
      role: 'driver'
    }));
    const results = await Promise.all(requests);
    assert.deepEqual(results.map((result) => result.statusCode).sort(), [201, 409]);
    assert.equal(await Delivery.countDocuments({ orderId: orderId.toString() }), 1);
  });

  it('enforces status order and synchronizes delivery completion to Order', async () => {
    const delivery = await Delivery.findOne({ orderId: orderId.toString() });
    const reqBase = { params: { id: delivery._id.toString() }, driver: delivery.driver.toString(), role: 'driver' };

    const invalid = await invoke(updateDeliveryStatus, { ...reqBase, body: { status: 'Delivered' } });
    assert.equal(invalid.statusCode, 409);
    for (const status of ['To be delivered', 'Picked-up', 'Delivered']) {
      const response = await invoke(updateDeliveryStatus, { ...reqBase, body: { status } });
      assert.equal(response.statusCode, 200);
    }

    const order = await mongoose.connection.db.collection('orders').findOne({ _id: orderId });
    const driver = await Driver.findById(delivery.driver);
    assert.equal(order.status, 'Delivered');
    assert.equal(order.paymentStatus, 'Paid');
    assert.equal(driver.status, 'available');
  });
});
