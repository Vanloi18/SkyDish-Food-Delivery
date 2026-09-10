const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'supersecretjwtkeyforfooddeliverymicroservices2025';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27000/food_delivery_db';
process.env.NODE_ENV = 'test';

const Payment = require('../models/PaymentModel');
const app = require('../server');

const customerAToken = jwt.sign(
  { id: 'customer_payment_A', role: 'customer', email: 'custA@test.com' },
  process.env.JWT_SECRET
);

const customerBToken = jwt.sign(
  { id: 'customer_payment_B', role: 'customer', email: 'custB@test.com' },
  process.env.JWT_SECRET
);

const adminToken = jwt.sign(
  { id: 'admin_payment_1', role: 'admin', email: 'admin@test.com' },
  process.env.JWT_SECRET
);

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await Payment.deleteMany({ orderId: { $regex: /^TEST_PAY_/ } });
});

test.after(async () => {
  await Payment.deleteMany({ orderId: { $regex: /^TEST_PAY_/ } });
  await mongoose.disconnect();
});

test('1. Reject payment when amount <= 0', async () => {
  const res = await request(app)
    .post('/api/payment/cod/process')
    .set('Authorization', `Bearer ${customerAToken}`)
    .send({
      orderId: 'TEST_PAY_INVALID',
      amount: -100,
      phone: '0901234567',
    });

  assert.strictEqual(res.status, 400);
  assert.match(res.body.error, /Invalid payment amount/);
});

test('2. Process Cash on Delivery (COD) payment successfully', async () => {
  const res = await request(app)
    .post('/api/payment/cod/process')
    .set('Authorization', `Bearer ${customerAToken}`)
    .send({
      orderId: 'TEST_PAY_COD_1',
      amount: 120000,
      phone: '0901234567',
      deliveryAddress: '123 Le Loi, D1, HCMC',
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.strictEqual(res.body.paymentMethod, 'COD');

  const saved = await Payment.findOne({ orderId: 'TEST_PAY_COD_1' });
  assert.ok(saved);
  assert.strictEqual(saved.status, 'Pending');
  assert.strictEqual(saved.userId, 'customer_payment_A');
});

test('3. Return Bank Transfer / VietQR configuration', async () => {
  const res = await request(app).get('/api/payment/bank-transfer/config');
  assert.strictEqual(res.status, 200);
  assert.ok(res.body.bankCode);
  assert.ok(res.body.accountNumber);
});

test('4. Create Bank Transfer payment successfully', async () => {
  const res = await request(app)
    .post('/api/payment/bank-transfer/create')
    .set('Authorization', `Bearer ${customerAToken}`)
    .send({
      orderId: 'TEST_PAY_BANK_1',
      amount: 250000,
      phone: '0901234567',
      email: 'custA@test.com',
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.qrUrl);
  assert.strictEqual(res.body.paymentMethod, 'BANK_TRANSFER');
});

test('5. Prevent Customer B from paying/modifying Customer A payment (RBAC Ownership)', async () => {
  // Customer B tries to create COD payment with Customer A's orderId
  const res = await request(app)
    .post('/api/payment/cod/process')
    .set('Authorization', `Bearer ${customerBToken}`)
    .send({
      orderId: 'TEST_PAY_COD_1', // belongs to Customer A
      amount: 120000,
      phone: '0909999999',
    });

  assert.strictEqual(res.status, 403);
  assert.match(res.body.error, /Access denied/);
});

test('6. Enforce ownership on status lookup: Owner vs Other User vs Admin', async () => {
  // Owner (Customer A) can view status
  const resOwner = await request(app)
    .get('/api/payment/status/TEST_PAY_COD_1')
    .set('Authorization', `Bearer ${customerAToken}`);
  assert.strictEqual(resOwner.status, 200);
  assert.strictEqual(resOwner.body.orderId, 'TEST_PAY_COD_1');

  // Non-owner (Customer B) is forbidden (403)
  const resOther = await request(app)
    .get('/api/payment/status/TEST_PAY_COD_1')
    .set('Authorization', `Bearer ${customerBToken}`);
  assert.strictEqual(resOther.status, 403);
  assert.match(resOther.body.error, /Access denied/);

  // Admin can view status
  const resAdmin = await request(app)
    .get('/api/payment/status/TEST_PAY_COD_1')
    .set('Authorization', `Bearer ${adminToken}`);
  assert.strictEqual(resAdmin.status, 200);
  assert.strictEqual(resAdmin.body.orderId, 'TEST_PAY_COD_1');
});
