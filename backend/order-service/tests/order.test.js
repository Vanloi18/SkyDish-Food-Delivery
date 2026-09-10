import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Order from '../models/orderModel.js';
import FoodItem from '../models/foodItemModel.js';
import {
  createOrderService,
  getOrdersService,
  getOrderByIdService,
  cancelOrderService
} from '../services/orderService.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';

describe('Order Service Architecture, Security & Business Rules', () => {
  let sampleFood;
  const userA = { id: '65f010101010101010101001', role: 'customer', name: 'User A', email: 'userA@test.com' };
  const userB = { id: '65f020202020202020202002', role: 'customer', name: 'User B', email: 'userB@test.com' };
  const adminUser = { id: '65f099999999999999999999', role: 'admin', name: 'Admin Master' };
  let orderAId;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    // Seed test food item with authoritative official price
    sampleFood = await FoodItem.create({
      restaurant: new mongoose.Types.ObjectId(),
      name: `Special Pho ${Date.now()}`,
      description: 'Authentic traditional Vietnamese noodle soup',
      price: 65000,
      category: 'Noodles',
      availability: true
    });
  });

  after(async () => {
    if (sampleFood) {
      await FoodItem.findByIdAndDelete(sampleFood._id);
    }
    await Order.deleteMany({ customerId: { $in: [userA.id, userB.id] } });
    await mongoose.disconnect();
  });

  it('SERVER AUTHORITY: overrides client-sent fake price and fake total with authoritative DB price', async () => {
    const maliciousPayload = {
      restaurantId: sampleFood.restaurant.toString(),
      items: [
        {
          foodId: sampleFood._id.toString(),
          quantity: 2,
          price: 1 // Malicious client attempts 1 VND
        }
      ],
      totalPrice: 2, // Malicious client attempts 2 VND total
      deliveryAddress: '123 Phố Huế, Hai Bà Trưng, Hà Nội'
    };

    const order = await createOrderService(maliciousPayload, userA);
    assert.ok(order._id);
    orderAId = order._id.toString();

    // Verification: authoritative price 65000 * 2 = 130000 + 15000 delivery fee = 145000
    assert.strictEqual(order.items[0].price, 65000);
    assert.strictEqual(order.subtotal, 130000);
    assert.strictEqual(order.deliveryFee, 15000);
    assert.strictEqual(order.totalPrice, 145000);
    assert.strictEqual(order.customerId, userA.id);
  });

  it('VALIDATION: rejects order with invalid quantity <= 0 with 400 Bad Request', async () => {
    const invalidPayload = {
      items: [{ foodId: sampleFood._id.toString(), quantity: 0, price: 65000 }],
      deliveryAddress: 'Hà Nội'
    };

    await assert.rejects(
      async () => await createOrderService(invalidPayload, userA),
      (err) => err.statusCode === 400
    );
  });

  it('VALIDATION: rejects order with fractional quantity e.g. 1.5 with 400 Bad Request', async () => {
    const invalidPayload = {
      items: [{ foodId: sampleFood._id.toString(), quantity: 1.5, price: 65000 }],
      deliveryAddress: 'Hà Nội'
    };

    await assert.rejects(
      async () => await createOrderService(invalidPayload, userA),
      (err) => err.statusCode === 400
    );
  });

  it('VALIDATION: rejects empty cart with 400 Bad Request', async () => {
    const emptyPayload = { items: [], deliveryAddress: 'Hà Nội' };
    await assert.rejects(
      async () => await createOrderService(emptyPayload, userA),
      (err) => err.statusCode === 400
    );
  });

  it('OWNERSHIP RULE: Customer A can fetch their own order details', async () => {
    const order = await getOrderByIdService(orderAId, userA);
    assert.ok(order);
    assert.strictEqual(order._id.toString(), orderAId);
  });

  it('OWNERSHIP RULE (CRITICAL): Customer B CANNOT view Customer A order -> 403 Forbidden', async () => {
    await assert.rejects(
      async () => await getOrderByIdService(orderAId, userB),
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        assert.match(err.message, /không có quyền/i);
        return true;
      }
    );
  });

  it('OWNERSHIP RULE (CRITICAL): Customer B CANNOT cancel Customer A order -> 403 Forbidden', async () => {
    await assert.rejects(
      async () => await cancelOrderService(orderAId, userB),
      (err) => {
        assert.strictEqual(err.statusCode, 403);
        return true;
      }
    );
  });

  it('ADMIN ACCESS: Admin can view any order', async () => {
    const order = await getOrderByIdService(orderAId, adminUser);
    assert.ok(order);
    assert.strictEqual(order._id.toString(), orderAId);
  });

  it('DATA LEAK PREVENTION: getOrdersService only returns User A orders for User A', async () => {
    const result = await getOrdersService({ user: userA, query: { page: 1, limit: 10 } });
    assert.ok(Array.isArray(result.data));
    assert.ok(result.pagination);
    assert.strictEqual(result.pagination.currentPage, 1);
    // Every order returned MUST belong to userA
    for (const ord of result.data) {
      assert.strictEqual(ord.customerId, userA.id);
    }
  });

  it('OWNERSHIP CANCELLATION: Customer A can cancel their own order', async () => {
    const canceled = await cancelOrderService(orderAId, userA);
    assert.strictEqual(canceled.status, 'Canceled');
  });
});
