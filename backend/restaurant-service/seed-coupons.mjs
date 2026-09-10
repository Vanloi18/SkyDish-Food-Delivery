import mongoose from 'mongoose';
import Coupon from './src/models/Coupon.js';

const MONGO_URI = 'mongodb://127.0.0.1:27000/food_delivery_db';

const defaultCoupons = [
  {
    code: 'SKYDISH20K',
    description: 'Giảm 20.000 ₫ cho đơn hàng từ 100.000 ₫',
    discountType: 'fixed',
    discountValue: 20000,
    minOrderValue: 100000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  },
  {
    code: 'FREESHIP',
    description: 'Miễn phí vận chuyển 25.000 ₫ cho đơn từ 150.000 ₫',
    discountType: 'shipping',
    discountValue: 25000,
    minOrderValue: 150000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  },
  {
    code: 'SKYDISH10',
    description: 'Giảm 10% tối đa 50.000 ₫ cho đơn từ 200.000 ₫',
    discountType: 'percentage',
    discountValue: 10,
    minOrderValue: 200000,
    maxDiscount: 50000,
    restaurantId: 'PLATFORM',
    usageLimit: 500,
    isActive: true,
  },
  {
    code: 'AMTHUC15K',
    description: 'Giảm ngay 15.000 ₫ cho mọi đơn hàng từ 80.000 ₫',
    discountType: 'fixed',
    discountValue: 15000,
    minOrderValue: 80000,
    restaurantId: 'PLATFORM',
    usageLimit: 1000,
    isActive: true,
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    for (const c of defaultCoupons) {
      await Coupon.findOneAndUpdate({ code: c.code }, c, { upsert: true, new: true });
      console.log(`✅ Seeded Coupon: ${c.code}`);
    }

    console.log('All Coupons successfully seeded into database!');
    process.exit(0);
  } catch (err) {
    console.error('Coupon seeding error:', err);
    process.exit(1);
  }
}

seed();
