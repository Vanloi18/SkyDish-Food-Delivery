import express from 'express';
import mongoose from 'mongoose';
import Coupon from '../models/Coupon.js';
import authMiddleware, { authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Validate a Coupon for Checkout (Backend Authoritative Calculation)
router.post('/validate', async (req, res) => {
  try {
    const { code, orderAmount, restaurantId, customerId } = req.body;

    if (!code) {
      return res.status(400).json({ valid: false, message: 'Vui lòng nhập mã giảm giá.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const coupon = await Coupon.findOne({ code: cleanCode });

    if (!coupon) {
      return res.status(404).json({ valid: false, message: 'Mã giảm giá không tồn tại hoặc đã hết hạn.' });
    }

    if (!coupon.isActive) {
      return res.status(400).json({ valid: false, message: 'Mã giảm giá này đã bị tạm ngừng áp dụng.' });
    }

    const now = new Date();
    if (coupon.startAt && now < coupon.startAt) {
      return res.status(400).json({ valid: false, message: 'Chương trình khuyến mãi chưa bắt đầu.' });
    }

    if (coupon.endAt && now > coupon.endAt) {
      return res.status(400).json({ valid: false, message: 'Mã giảm giá này đã hết hạn sử dụng.' });
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ valid: false, message: 'Mã giảm giá đã hết lượt sử dụng.' });
    }

    // Check restaurant applicability
    if (coupon.restaurantId !== 'PLATFORM' && restaurantId && coupon.restaurantId !== restaurantId.toString()) {
      return res.status(400).json({ valid: false, message: 'Mã giảm giá này chỉ áp dụng cho nhà hàng chỉ định.' });
    }

    const subtotal = Number(orderAmount) || 0;
    if (subtotal < coupon.minOrderValue) {
      return res.status(400).json({
        valid: false,
        message: `Đơn hàng chưa đạt giá trị tối thiểu ${coupon.minOrderValue.toLocaleString('vi-VN')} ₫ để áp dụng mã này.`,
      });
    }

    // Check per-user limit
    if (customerId && coupon.usedByUsers) {
      const userUsage = coupon.usedByUsers.filter((u) => u.userId === customerId).length;
      if (userUsage >= coupon.perUserLimit) {
        return res.status(400).json({ valid: false, message: 'Bạn đã đạt giới hạn sử dụng mã giảm giá này.' });
      }
    }

    // Calculate Discount Amount
    let discountAmount = 0;
    if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(coupon.discountValue, subtotal);
    } else if (coupon.discountType === 'percentage') {
      const calculated = (subtotal * coupon.discountValue) / 100;
      discountAmount = coupon.maxDiscount > 0 ? Math.min(calculated, coupon.maxDiscount) : calculated;
      discountAmount = Math.min(discountAmount, subtotal);
    } else if (coupon.discountType === 'shipping') {
      discountAmount = Math.min(coupon.discountValue || 25000, 25000);
    }

    discountAmount = Math.round(discountAmount);
    const finalAmount = Math.max(0, subtotal - discountAmount);

    res.status(200).json({
      valid: true,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
      finalAmount,
      message: `Áp dụng mã thành công! Giảm ${discountAmount.toLocaleString('vi-VN')} ₫`,
      coupon: {
        id: coupon._id,
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });
  } catch (err) {
    console.error('Error validating coupon:', err);
    res.status(500).json({ valid: false, message: 'Lỗi máy chủ khi kiểm tra mã giảm giá.' });
  }
});

// 2. Get all active coupons (Platform + general)
router.get('/', async (req, res) => {
  try {
    const coupons = await Coupon.find({ isActive: true }).sort({ createdAt: -1 });
    res.status(200).json(coupons);
  } catch (err) {
    console.error('Error fetching coupons:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách mã giảm giá.' });
  }
});

// 3. Get coupons for a specific restaurant
router.get('/restaurant/:restaurantId', async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const coupons = await Coupon.find({
      isActive: true,
      $or: [{ restaurantId: 'PLATFORM' }, { restaurantId }],
    }).sort({ createdAt: -1 });

    res.status(200).json(coupons);
  } catch (err) {
    console.error('Error fetching restaurant coupons:', err);
    res.status(500).json({ message: 'Lỗi máy chủ.' });
  }
});

// 4. Create a new coupon (Merchant or Admin)
router.post('/create', authMiddleware, authorizeRoles('restaurant', 'superAdmin'), async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      restaurantId,
      usageLimit,
      endAt,
    } = req.body;

    if (!code || !discountType || discountValue === undefined) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã, loại giảm giá và giá trị ưu đãi.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ message: `Mã giảm giá '${cleanCode}' đã tồn tại trong hệ thống.` });
    }

    const ownerRestaurantId = req.user.role === 'restaurant' ? req.user.id : (restaurantId || 'PLATFORM');
    const newCoupon = new Coupon({
      code: cleanCode,
      description: description || `Ưu đãi ${cleanCode}`,
      discountType,
      discountValue: Number(discountValue),
      minOrderValue: Number(minOrderValue) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      restaurantId: ownerRestaurantId,
      usageLimit: Number(usageLimit) || 1000,
      endAt: endAt ? new Date(endAt) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    await newCoupon.save();
    res.status(201).json({ message: 'Tạo mã giảm giá thành công!', coupon: newCoupon });
  } catch (err) {
    console.error('Error creating coupon:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo mã giảm giá.' });
  }
});

// 5. Toggle / Deactivate coupon
router.put('/:id/deactivate', authMiddleware, authorizeRoles('restaurant', 'superAdmin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Mã coupon không hợp lệ.' });
    }
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    }
    if (req.user.role === 'restaurant' && coupon.restaurantId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật coupon của nhà hàng khác.' });
    }

    coupon.isActive = !coupon.isActive;
    await coupon.save();

    res.status(200).json({
      message: `Đã ${coupon.isActive ? 'kích hoạt' : 'tạm dừng'} mã giảm giá ${coupon.code}!`,
      coupon,
    });
  } catch (err) {
    console.error('Error toggling coupon status:', err);
    res.status(500).json({ message: 'Lỗi cập nhật trạng thái mã.' });
  }
});

// 6. Delete coupon
router.delete('/:id', authMiddleware, authorizeRoles('restaurant', 'superAdmin'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Mã coupon không hợp lệ.' });
    }
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    }
    if (req.user.role === 'restaurant' && coupon.restaurantId !== req.user.id) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa coupon của nhà hàng khác.' });
    }
    await coupon.deleteOne();
    res.status(200).json({ message: 'Đã xóa mã giảm giá.' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ message: 'Lỗi xóa mã giảm giá.' });
  }
});

export default router;
