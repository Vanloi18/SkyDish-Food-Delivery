import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      index: true,
    },
    customerId: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: 'Khách hàng',
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'hidden', 'flagged'],
      default: 'active',
    },
    reply: {
      comment: { type: String, default: '' },
      repliedAt: { type: Date },
    },
  },
  { timestamps: true }
);

// Prevent multiple reviews on the same order by the same customer
reviewSchema.index({ orderId: 1, customerId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);
export default Review;
