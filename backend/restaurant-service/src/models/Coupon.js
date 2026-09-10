import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'shipping'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      default: 0, // 0 = no cap
    },
    restaurantId: {
      type: String,
      default: 'PLATFORM', // 'PLATFORM' or MongoDB ObjectId string of specific restaurant
      index: true,
    },
    usageLimit: {
      type: Number,
      default: 1000,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    perUserLimit: {
      type: Number,
      default: 1,
    },
    usedByUsers: [
      {
        userId: String,
        usedAt: { type: Date, default: Date.now },
        orderId: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    startAt: {
      type: Date,
      default: Date.now,
    },
    endAt: {
      type: Date,
      default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year validity
    },
  },
  { timestamps: true }
);

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
