const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { PayOS } = require('@payos/node');

process.env.JWT_SECRET = 'supersecretjwtkeyforfooddeliverymicroservices2025';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
process.env.NODE_ENV = 'test';
process.env.PAYOS_CLIENT_ID = 'test-client-id';
process.env.PAYOS_API_KEY = 'test-api-key';
process.env.PAYOS_CHECKSUM_KEY = 'test-checksum-key';

const Payment = require('../models/PaymentModel');
const { applyPayOSStatus } = require('../services/paymentProviders/payosProvider');
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
const payos = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID,
  apiKey: process.env.PAYOS_API_KEY,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY,
});

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await Payment.deleteMany({ orderId: { $regex: /^TEST_PAY_/ } });
});

test.after(async () => {
  await Payment.deleteMany({ orderId: { $regex: /^TEST_PAY_/ } });
  if (mongoose.connection.db) {
    await mongoose.connection.db.collection('orders').deleteMany({ testTag: 'TEST_PAY_PAYOS' });
  }
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

test('7. Reject unauthenticated guest payment status lookup with 401', async () => {
  const resGuest = await request(app).get('/api/payment/status/TEST_PAY_COD_1');
  assert.strictEqual(resGuest.status, 401);
  assert.match(resGuest.body.error, /Unauthorized/);
});

test('8. Reject unauthenticated guest payment creation with 401', async () => {
  const resGuest = await request(app)
    .post('/api/payment/cod/process')
    .send({
      orderId: 'TEST_PAY_COD_GUEST',
      amount: 100000,
      phone: '0901234567',
    });
  assert.strictEqual(resGuest.status, 401);
  assert.match(resGuest.body.error, /Unauthorized/);
});

test('9. Reject PayOS webhook with an invalid signature', async () => {
  const res = await request(app)
    .post('/api/payment/payos/webhook')
    .send({ code: '00', desc: 'success', success: true, data: { orderCode: 987654321, amount: 10000 }, signature: 'invalid' });

  assert.strictEqual(res.status, 400);
});

test('10. Verify PayOS webhook and mark matching payment as paid', async () => {
  const orderCode = 987654322;
  const orderId = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection('orders').insertOne({
    _id: orderId,
    testTag: 'TEST_PAY_PAYOS',
    status: 'Pending',
    paymentStatus: 'Pending',
  });
  await Payment.create({
    orderId: orderId.toString(),
    userId: 'customer_payment_A',
    amount: 10000,
    paymentMethod: 'PAYOS',
    payosOrderCode: orderCode,
    email: 'custA@test.com',
    phone: '0901234567',
  });
  const data = {
    orderCode,
    amount: 10000,
    description: 'SD9876543',
    accountNumber: '12345678',
    reference: 'PAYOS_TEST_TX_1',
    transactionDateTime: new Date().toISOString(),
    currency: 'VND',
    paymentLinkId: 'payos-test-link-1',
    code: '00',
    desc: 'Thành công',
  };
  const signature = await payos.crypto.createSignatureFromObj(data, payos.checksumKey);
  const res = await request(app)
    .post('/api/payment/payos/webhook')
    .send({ code: '00', desc: 'success', success: true, data, signature });

  assert.strictEqual(res.status, 200);
  const saved = await Payment.findOne({ orderId: orderId.toString() });
  assert.strictEqual(saved.status, 'Paid');
  assert.strictEqual(saved.providerTransactionId, 'PAYOS_TEST_TX_1');
  const synchronizedOrder = await mongoose.connection.db.collection('orders').findOne({ _id: orderId });
  assert.strictEqual(synchronizedOrder.paymentStatus, 'Paid');
  assert.strictEqual(synchronizedOrder.status, 'Confirmed');
});

test('11. Reject PayOS webhook when its signed amount differs from the payment', async () => {
  const orderCode = 987654323;
  await Payment.create({
    orderId: 'TEST_PAY_PAYOS_2',
    userId: 'customer_payment_A',
    amount: 10000,
    paymentMethod: 'PAYOS',
    payosOrderCode: orderCode,
    email: 'custA@test.com',
    phone: '0901234567',
  });
  const data = {
    orderCode,
    amount: 9999,
    description: 'SD9876543',
    accountNumber: '12345678',
    reference: 'PAYOS_TEST_TX_2',
    transactionDateTime: new Date().toISOString(),
    currency: 'VND',
    paymentLinkId: 'payos-test-link-2',
    code: '00',
    desc: 'Thành công',
  };
  const signature = await payos.crypto.createSignatureFromObj(data, payos.checksumKey);
  const res = await request(app)
    .post('/api/payment/payos/webhook')
    .send({ code: '00', desc: 'success', success: true, data, signature });

  assert.strictEqual(res.status, 400);
  const saved = await Payment.findOne({ orderId: 'TEST_PAY_PAYOS_2' });
  assert.strictEqual(saved.status, 'Pending');
});

test('12. Acknowledge a valid PayOS webhook registration probe without changing payments', async () => {
  const data = {
    orderCode: 123,
    amount: 3000,
    description: 'VQRIO123',
    accountNumber: '12345678',
    reference: 'PAYOS_WEBHOOK_PROBE',
    transactionDateTime: new Date().toISOString(),
    currency: 'VND',
    paymentLinkId: 'payos-webhook-probe',
    code: '00',
    desc: 'Thành công',
  };
  const signature = await payos.crypto.createSignatureFromObj(data, payos.checksumKey);
  const res = await request(app)
    .post('/api/payment/payos/webhook')
    .send({ code: '00', desc: 'success', success: true, data, signature });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.result.ignored, true);
});

test('13. Mark the order canceled when the customer cancels PayOS payment', async () => {
  const orderId = new mongoose.Types.ObjectId();
  await mongoose.connection.db.collection('orders').insertOne({
    _id: orderId,
    testTag: 'TEST_PAY_PAYOS',
    status: 'Pending',
    paymentStatus: 'Pending',
  });
  const payment = await Payment.create({
    orderId: orderId.toString(),
    userId: 'customer_payment_A',
    amount: 10000,
    paymentMethod: 'PAYOS',
    payosOrderCode: 987654324,
    email: 'custA@test.com',
    phone: '0901234567',
  });

  await applyPayOSStatus(payment, 'CANCELLED', { status: 'CANCELLED' });

  const savedPayment = await Payment.findOne({ orderId: orderId.toString() });
  const savedOrder = await mongoose.connection.db.collection('orders').findOne({ _id: orderId });
  assert.strictEqual(savedPayment.status, 'Cancelled');
  assert.strictEqual(savedOrder.status, 'Canceled');
  assert.strictEqual(savedOrder.paymentStatus, 'Failed');
});

