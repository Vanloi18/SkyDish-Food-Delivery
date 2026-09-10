const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';

describe('Auth Service Unit & Integration Tests', () => {
  const timestamp = Date.now();
  const testCustomer = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `auth_unit_${timestamp}@skydish.com`,
    phone: '0987654321',
    password: 'password123',
    location: 'Hà Nội, Việt Nam'
  };

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }
  });

  after(async () => {
    await Customer.deleteMany({ email: { $regex: 'auth_unit_' } });
    await mongoose.disconnect();
  });

  it('should register a new customer with hashed password', async () => {
    const customer = await Customer.create(testCustomer);
    assert.ok(customer._id);
    assert.strictEqual(customer.email, testCustomer.email);
    assert.notStrictEqual(customer.password, testCustomer.password); // must be hashed
  });

  it('should verify correct password using comparePassword', async () => {
    const customer = await Customer.findOne({ email: testCustomer.email }).select('+password');
    assert.ok(customer);
    const isMatch = await customer.comparePassword('password123');
    assert.strictEqual(isMatch, true);
    const isWrong = await customer.comparePassword('wrongpassword');
    assert.strictEqual(isWrong, false);
  });

  it('should generate valid JWT containing customer id and role', () => {
    const token = jwt.sign(
      { id: '1234567890abcdef', role: 'customer', email: testCustomer.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
    const decoded = jwt.verify(token, JWT_SECRET);
    assert.strictEqual(decoded.role, 'customer');
    assert.strictEqual(decoded.id, '1234567890abcdef');
  });

  it('should reject invalid or tampered JWT', () => {
    assert.throws(() => {
      jwt.verify('invalid.token.here', JWT_SECRET);
    });
  });
});
