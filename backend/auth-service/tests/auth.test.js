const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Customer = require('../models/Customer');
const { protect, requireRole } = require('../middlewares/auth');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/food_delivery_db';
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';

describe('Auth Service Comprehensive Unit & Security Tests', () => {
  const timestamp = Date.now();
  let isDbConnected = false;

  const testCustomer = {
    firstName: 'Test',
    lastName: 'Customer',
    email: `auth_unit_${timestamp}@skydish.com`,
    phone: '0987654321',
    password: 'password123',
    location: 'Hà Nội, Việt Nam'
  };

  before(async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 1500 });
        isDbConnected = true;
      }
    } catch (err) {
      isDbConnected = false;
      console.log('ℹ️ [Notice] Local MongoDB offline; running standalone cryptographic & security middleware tests.');
    }
  });

  after(async () => {
    if (isDbConnected) {
      try {
        await Customer.deleteMany({ email: { $regex: 'auth_unit_' } });
        await mongoose.disconnect();
      } catch (e) {}
    }
  });

  // 1. Password Hashing & Cryptography
  it('should securely hash password with bcrypt cost factor >= 10', async () => {
    const rawPassword = 'SecurePassword2026!';
    const hash = await bcrypt.hash(rawPassword, 12);
    assert.notStrictEqual(hash, rawPassword);
    const isMatch = await bcrypt.compare(rawPassword, hash);
    assert.strictEqual(isMatch, true);
    const isWrong = await bcrypt.compare('WrongPassword!', hash);
    assert.strictEqual(isWrong, false);
  });

  // 2. Integration Database Registration (Conditional on DB presence)
  it('should register a new customer with hashed password in database', async (t) => {
    if (!isDbConnected) {
      t.skip('Skipped: MongoDB is not available in current environment');
      return;
    }
    const customer = await Customer.create(testCustomer);
    assert.ok(customer._id);
    assert.strictEqual(customer.email, testCustomer.email);
    assert.notStrictEqual(customer.password, testCustomer.password);
  });

  it('should verify customer password using comparePassword method', async (t) => {
    if (!isDbConnected) {
      t.skip('Skipped: MongoDB is not available in current environment');
      return;
    }
    const customer = await Customer.findOne({ email: testCustomer.email }).select('+password');
    assert.ok(customer);
    const isMatch = await customer.comparePassword('password123');
    assert.strictEqual(isMatch, true);
    const isWrong = await customer.comparePassword('wrongpassword');
    assert.strictEqual(isWrong, false);
  });

  // 3. JWT Signing & Verification
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

  it('should reject expired JWT token with TokenExpiredError', () => {
    const expiredToken = jwt.sign(
      { id: '1234567890abcdef', role: 'customer' },
      JWT_SECRET,
      { expiresIn: -10 }
    );
    assert.throws(
      () => {
        jwt.verify(expiredToken, JWT_SECRET);
      },
      (err) => err.name === 'TokenExpiredError'
    );
  });

  // 4. Protect Middleware Security
  it('should reject request with missing Authorization header (HTTP 401)', async () => {
    const req = { headers: {} };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
      }
    };

    await protect(req, res, () => {});
    assert.strictEqual(statusCode, 401);
    assert.match(responseBody.message, /not logged in/i);
  });

  it('should reject request with expired token (HTTP 401 with TokenExpiredError)', async () => {
    const expiredToken = jwt.sign(
      { id: '1234567890abcdef', role: 'customer' },
      JWT_SECRET,
      { expiresIn: -10 }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
      }
    };

    await protect(req, res, () => {});
    assert.strictEqual(statusCode, 401);
    assert.strictEqual(responseBody.error, 'TokenExpiredError');
  });

  it('should accept valid Bearer token and attach user identity (protect middleware)', async () => {
    const validToken = jwt.sign(
      { id: 'customer_7788', role: 'customer', email: 'cust@skydish.com', name: 'Nguyen Van A' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    let nextCalled = false;

    await protect(req, {}, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.userId, 'customer_7788');
    assert.strictEqual(req.userRole, 'customer');
    assert.strictEqual(req.user.email, 'cust@skydish.com');
  });

  // 5. RBAC Middleware Security
  it('should authorize user with matching role (requireRole middleware: Next called)', () => {
    const req = {
      user: { id: 'cust_1', role: 'customer' },
      userRole: 'customer'
    };
    let nextCalled = false;

    requireRole('customer')(req, {}, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });

  it('should forbid user with unauthorized role (requireRole middleware: HTTP 403 Forbidden)', () => {
    const req = {
      user: { id: 'cust_1', role: 'customer' },
      userRole: 'customer'
    };
    let statusCode = null;
    let responseBody = null;
    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
      }
    };

    requireRole('admin')(req, res, () => {});
    assert.strictEqual(statusCode, 403);
    assert.match(responseBody.message, /Access denied/i);
  });

  it('should allow superAdmin to access admin-protected routes (role equivalence)', () => {
    const req = {
      user: { id: 'super_admin_1', role: 'superAdmin' },
      userRole: 'superAdmin'
    };
    let nextCalled = false;

    requireRole('admin')(req, {}, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
  });
});
