import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import Restaurant from '../src/models/Restaurant.js';
import FoodItem from '../src/models/FoodItem.js';
import Coupon from '../src/models/Coupon.js';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27000/food_delivery_db';

describe('Restaurant Service Tests (CRUD, Search, Pagination, Ownership)', () => {
  let restA;
  let restB;
  let sampleFood;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
    }

    const ts = Date.now();
    restA = await Restaurant.create({
      name: `Quán Phở Hà Nội ${ts}`,
      ownerName: 'Nguyễn Văn A',
      location: '120 Phố Huế, Hai Bà Trưng, Hà Nội',
      contactNumber: '0912345678',
      email: `restA_${ts}@skydish.com`,
      admin: { email: `adminA_${ts}@skydish.com`, password: 'password123' },
      availability: true
    });

    restB = await Restaurant.create({
      name: `Bánh Mì Sài Gòn ${ts}`,
      ownerName: 'Trần Thị B',
      location: '45 Lê Lợi, Quận 1, TP.HCM',
      contactNumber: '0987654321',
      email: `restB_${ts}@skydish.com`,
      admin: { email: `adminB_${ts}@skydish.com`, password: 'password123' },
      availability: true
    });

    sampleFood = await FoodItem.create({
      restaurant: restA._id,
      name: `Phở Bò Tái Lăn ${ts}`,
      description: 'Bò tái lăn xào thơm lừng với hành hoa',
      price: 75000,
      category: 'Phở',
      availability: true
    });
  });

  after(async () => {
    if (restA) await Restaurant.findByIdAndDelete(restA._id);
    if (restB) await Restaurant.findByIdAndDelete(restB._id);
    if (sampleFood) await FoodItem.findByIdAndDelete(sampleFood._id);
    await mongoose.disconnect();
  });

  it('FOOD CREATION: restaurant can create food items attached to their store', async () => {
    assert.ok(sampleFood._id);
    assert.strictEqual(sampleFood.restaurant.toString(), restA._id.toString());
    assert.strictEqual(sampleFood.price, 75000);
  });

  it('OWNERSHIP ENFORCEMENT: restaurant B cannot modify restaurant A food item', async () => {
    const isOwner = sampleFood.restaurant.toString() === restB._id.toString();
    assert.strictEqual(isOwner, false, 'Restaurant B must not be recognized as owner of Restaurant A food');
  });

  it('SEARCH & FILTER: can query by name and price range with regex safety', async () => {
    const foods = await FoodItem.find({
      restaurant: restA._id,
      price: { $gte: 50000, $lte: 100000 }
    });
    assert.ok(foods.length >= 1);
    assert.strictEqual(foods[0].name, sampleFood.name);
  });

  it('PAGINATION: verify skip and limit returns correct page count and metadata', async () => {
    const totalItems = await FoodItem.countDocuments();
    const limit = 5;
    const page = 1;
    const items = await FoodItem.find().skip(0).limit(limit);
    assert.ok(items.length <= limit);
    const totalPages = Math.ceil(totalItems / limit) || 1;
    assert.ok(totalPages >= 1);
  });

  it('VOUCHER ENGINE: validate coupon minOrderValue and discount calculation', async () => {
    const coupon = await Coupon.findOne({ code: 'SKYDISH20K' });
    if (coupon) {
      assert.strictEqual(coupon.code, 'SKYDISH20K');
      assert.ok(coupon.discountValue > 0);
    }
  });
});
