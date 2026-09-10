import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: { type: String, required: true },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'shipping'],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },
    maxDiscount: { type: Number, default: 0 },
    restaurantId: { type: String, default: 'PLATFORM' },
    usageLimit: { type: Number, default: 1000 },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedByUsers: [
      {
        userId: String,
        usedAt: { type: Date, default: Date.now },
        orderId: String,
      },
    ],
    isActive: { type: Boolean, default: true },
    startAt: { type: Date, default: Date.now },
    endAt: { type: Date },
  },
  { timestamps: true }
);

const Coupon = mongoose.models.Coupon || mongoose.model('Coupon', couponSchema);
export default Coupon;
