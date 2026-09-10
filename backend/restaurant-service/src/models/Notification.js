import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['customer', 'restaurant', 'delivery', 'admin', 'all'],
      default: 'customer',
      index: true,
    },
    type: {
      type: String,
      enum: ['order', 'review', 'coupon', 'system', 'delivery'],
      default: 'order',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      enum: ['order', 'restaurant', 'coupon', 'review', 'none'],
      default: 'none',
    },
    entityId: {
      type: String,
      default: '',
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
