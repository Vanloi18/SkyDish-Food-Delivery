import express from 'express';
import Coupon from '../models/Coupon.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

const managerRoles = new Set(['restaurant', 'admin', 'superAdmin']);

const isCouponManager = (req) => managerRoles.has(req.user?.role);

const ownsCoupon = (req, coupon) => (
  req.user?.role === 'admin' ||
  req.user?.role === 'superAdmin' ||
  (req.user?.role === 'restaurant' && String(coupon.restaurantId) === String(req.user.id))
);

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
        restaurantId: coupon.restaurantId,
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
router.post('/create', authMiddleware, async (req, res) => {
  try {
    if (!isCouponManager(req)) {
      return res.status(403).json({ message: 'Bạn không có quyền tạo mã giảm giá.' });
    }

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

    const validDiscountTypes = new Set(['percentage', 'fixed', 'shipping']);
    if (typeof code !== 'string' || !code.trim() || !validDiscountTypes.has(discountType) || discountValue === undefined) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mã, loại giảm giá và giá trị ưu đãi.' });
    }

    const numericDiscount = Number(discountValue);
    const numericMinOrder = minOrderValue === undefined || minOrderValue === '' ? 0 : Number(minOrderValue);
    const numericMaxDiscount = maxDiscount === undefined || maxDiscount === '' ? 0 : Number(maxDiscount);
    const numericUsageLimit = usageLimit === undefined || usageLimit === '' ? 1000 : Number(usageLimit);
    if (!Number.isFinite(numericDiscount) || numericDiscount < 0 || !Number.isFinite(numericMinOrder) || numericMinOrder < 0 || numericMaxDiscount < 0 || numericUsageLimit <= 0) {
      return res.status(400).json({ message: 'Giá trị giảm, đơn tối thiểu và giới hạn sử dụng phải hợp lệ.' });
    }

    const scopedRestaurantId = req.user.role === 'restaurant'
      ? String(req.user.id)
      : (restaurantId || 'PLATFORM');
    if (req.user.role === 'restaurant' && restaurantId && String(restaurantId) !== String(req.user.id)) {
      return res.status(403).json({ message: 'Nhà hàng chỉ được tạo mã giảm giá cho chính mình.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await Coupon.findOne({ code: cleanCode });
    if (existing) {
      return res.status(400).json({ message: `Mã giảm giá '${cleanCode}' đã tồn tại trong hệ thống.` });
    }

    const newCoupon = new Coupon({
      code: cleanCode,
      description: description || `Ưu đãi ${cleanCode}`,
      discountType,
      discountValue: numericDiscount,
      minOrderValue: numericMinOrder,
      maxDiscount: numericMaxDiscount,
      restaurantId: scopedRestaurantId,
      usageLimit: numericUsageLimit,
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
router.put('/:id/deactivate', authMiddleware, async (req, res) => {
  try {
    if (!isCouponManager(req)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật mã giảm giá.' });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    }
    if (!ownsCoupon(req, coupon)) {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật mã giảm giá của nhà hàng khác.' });
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
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isCouponManager(req)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa mã giảm giá.' });
    }

    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) {
      return res.status(404).json({ message: 'Không tìm thấy mã giảm giá.' });
    }
    if (!ownsCoupon(req, coupon)) {
      return res.status(403).json({ message: 'Bạn không có quyền xóa mã giảm giá của nhà hàng khác.' });
    }

    await coupon.deleteOne();
    res.status(200).json({ message: 'Đã xóa mã giảm giá.' });
  } catch (err) {
    console.error('Error deleting coupon:', err);
    res.status(500).json({ message: 'Lỗi xóa mã giảm giá.' });
  }
});

export default router;
