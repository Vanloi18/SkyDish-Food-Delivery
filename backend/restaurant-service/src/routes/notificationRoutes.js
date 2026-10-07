import express from 'express';
import Notification from '../models/Notification.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
router.use(authMiddleware);

const normalizeRole = (role) => {
  if (role === 'superAdmin' || role === 'admin') return 'admin';
  if (role === 'driver' || role === 'delivery') return 'delivery';
  return role;
};

router.use((req, res, next) => {
  const role = normalizeRole(req.user?.role);
  if (!req.user?.id || !['customer', 'restaurant', 'delivery', 'admin'].includes(role)) {
    return res.status(403).json({ message: 'Tài khoản không hỗ trợ thông báo.' });
  }
  req.notificationRole = role;
  next();
});

const getVisibleFilter = (req) => {
  const userId = String(req.user?.id || '');
  return {
    role: { $in: [req.notificationRole, 'all'] },
    $or: [{ userId }, { userId: 'all' }],
  };
};

// 1. Create a notification
router.post('/create', async (req, res) => {
  try {
    if (!['admin', 'superAdmin'].includes(req.user?.role)) {
      return res.status(403).json({ message: 'Không có quyền tạo thông báo.' });
    }

    const { userId, role, type, title, message, entityType, entityId } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({ message: 'Thiếu thông tin người nhận, tiêu đề hoặc nội dung thông báo.' });
    }

    const newNotif = new Notification({
      userId,
      role: role || 'customer',
      type: type || 'order',
      title,
      message,
      entityType: entityType || 'none',
      entityId: entityId || '',
    });

    await newNotif.save();
    res.status(201).json({ message: 'Tạo thông báo thành công', notification: newNotif });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ message: 'Lỗi máy chủ khi tạo thông báo.' });
  }
});

// 2. Get notifications for a user (by query ?userId=...&role=...)
router.get('/', async (req, res) => {
  try {
    const userId = String(req.user.id);
    const filter = getVisibleFilter(req);
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const [directUnread, broadcastUnread] = await Promise.all([
      Notification.countDocuments({
        userId,
        role: filter.role,
        isRead: false,
      }),
      Notification.countDocuments({
        userId: 'all',
        role: filter.role,
        readBy: { $ne: userId },
      }),
    ]);

    res.status(200).json({
      unreadCount: directUnread + broadcastUnread,
      notifications: notifications.map((notification) => {
        const result = notification.toObject();
        result.isRead = notification.userId === 'all'
          ? notification.readBy.includes(userId)
          : notification.isRead;
        return result;
      }),
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách thông báo.' });
  }
});

// 3. Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const userId = String(req.user.id);
    const role = { $in: [req.notificationRole, 'all'] };
    const [directUnread, broadcastUnread] = await Promise.all([
      Notification.countDocuments({ userId, role, isRead: false }),
      Notification.countDocuments({ userId: 'all', role, readBy: { $ne: userId } }),
    ]);
    res.status(200).json({ unreadCount: directUnread + broadcastUnread });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ message: 'Lỗi lấy số lượng thông báo chưa đọc.' });
  }
});

// 4. Mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const filter = getVisibleFilter(req);
    const notif = await Notification.findOne({ _id: req.params.id, ...filter });
    if (!notif) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }

    if (notif.userId === 'all') {
      await Notification.updateOne({ _id: notif._id }, { $addToSet: { readBy: String(req.user.id) } });
      notif.isRead = true;
    } else {
      notif.isRead = true;
      await notif.save();
    }

    res.status(200).json({ message: 'Đã đánh dấu đã đọc.', notification: notif });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ message: 'Lỗi cập nhật thông báo.' });
  }
});

// 5. Mark all as read for a user
router.put('/read-all', async (req, res) => {
  try {
    const userId = String(req.user.id);
    const filter = getVisibleFilter(req);
    await Notification.updateMany(
      { userId, role: filter.role, isRead: false },
      { $set: { isRead: true } }
    );
    await Notification.updateMany(
      { userId: 'all', role: filter.role, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } }
    );
    res.status(200).json({ message: 'Tất cả thông báo đã được đánh dấu đã đọc.' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Lỗi cập nhật thông báo.' });
  }
});

// 6. Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notif = await Notification.findOneAndDelete({
      _id: req.params.id,
      userId: String(req.user.id),
      role: { $in: [req.notificationRole, 'all'] },
    });
    if (!notif) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
    }
    res.status(200).json({ message: 'Đã xóa thông báo.' });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ message: 'Lỗi xóa thông báo.' });
  }
});

export default router;
