import express from 'express';
import mongoose from 'mongoose';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import Restaurant from '../models/Restaurant.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Submit a review for a completed order
router.post('/', async (req, res) => {
  try {
    const { orderId, customerId, customerName, restaurantId, rating, comment } = req.body;

    if (!orderId || !customerId || !restaurantId) {
      return res.status(400).json({ message: 'Thiếu thông tin mã đơn hàng, khách hàng hoặc nhà hàng.' });
    }

    const numRating = Number(rating);
    if (!numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ message: 'Điểm đánh giá phải là số nguyên từ 1 đến 5 sao.' });
    }

    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ message: 'Vui lòng nhập nhận xét đánh giá của bạn.' });
    }

    // Check for duplicate review on same order
    const existing = await Review.findOne({ orderId, customerId });
    if (existing) {
      return res.status(400).json({ message: 'Đơn hàng này đã được bạn đánh giá trước đó.' });
    }

    // Verify restaurant exists
    let restaurant = null;
    if (mongoose.Types.ObjectId.isValid(restaurantId)) {
      restaurant = await Restaurant.findById(restaurantId);
    }
    if (!restaurant) {
      return res.status(404).json({ message: 'Nhà hàng không tồn tại.' });
    }

    const newReview = new Review({
      orderId,
      customerId,
      customerName: customerName || 'Khách hàng',
      restaurantId,
      rating: Math.round(numRating),
      comment: comment.trim(),
    });

    await newReview.save();

    // Create Notification for Restaurant Partner
    try {
      await Notification.create({
        userId: restaurantId.toString(),
        role: 'restaurant',
        type: 'review',
        title: '⭐ Đánh giá mới từ thực khách!',
        message: `${customerName || 'Khách hàng'} vừa đánh giá ${Math.round(numRating)} sao: "${comment.trim().slice(0, 50)}..."`,
        entityType: 'review',
        entityId: newReview._id.toString(),
      });
    } catch (notifErr) {
      console.warn('Could not create notification for review:', notifErr.message);
    }

    res.status(201).json({
      message: 'Cảm ơn bạn đã gửi đánh giá cho nhà hàng!',
      review: newReview,
    });
  } catch (err) {
    console.error('Error submitting review:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi gửi đánh giá.' });
  }
});

// 2. Get reviews and calculated metrics for a restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const reviews = await Review.find({ restaurantId, status: 'active' }).sort({ createdAt: -1 });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews).toFixed(1))
        : 5.0;

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      if (distribution[r.rating] !== undefined) {
        distribution[r.rating]++;
      }
    });

    res.status(200).json({
      totalReviews,
      averageRating,
      distribution,
      reviews,
    });
  } catch (err) {
    console.error('Error getting restaurant reviews:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách đánh giá.' });
  }
});

// 3. Get review by orderId (to check if already reviewed)
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const review = await Review.findOne({ orderId });
    if (!review) {
      return res.status(200).json({ reviewed: false, review: null });
    }
    res.status(200).json({ reviewed: true, review });
  } catch (err) {
    console.error('Error getting order review:', err);
    res.status(500).json({ message: 'Lỗi kiểm tra đánh giá đơn hàng.' });
  }
});

// 4. Admin endpoint: Get all reviews
router.get('/', async (req, res) => {
  try {
    const reviews = await Review.find().populate('restaurantId', 'name location').sort({ createdAt: -1 });
    res.status(200).json(reviews);
  } catch (err) {
    console.error('Error fetching all reviews:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 5. Restaurant Partner Reply to Review
router.put('/:id/reply', authMiddleware, async (req, res) => {
  try {
    const { replyComment } = req.body;
    if (!replyComment || !replyComment.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });
    }

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá.' });
    }

    // Ownership check: must match restaurant
    if (review.restaurantId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền phản hồi đánh giá của nhà hàng khác.' });
    }

    review.reply = {
      comment: replyComment.trim(),
      repliedAt: new Date(),
    };
    await review.save();

    res.status(200).json({ message: 'Đã phản hồi đánh giá thành công!', review });
  } catch (err) {
    console.error('Error replying to review:', err);
    res.status(500).json({ message: 'Lỗi phản hồi đánh giá.' });
  }
});

export default router;
