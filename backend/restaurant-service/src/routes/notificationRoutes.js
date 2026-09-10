import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();

// 1. Create a notification
router.post('/create', async (req, res) => {
  try {
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
    const { userId, role } = req.query;
    const filter = {};

    if (userId) {
      filter.$or = [{ userId }, { userId: 'all' }];
    } else if (role) {
      filter.role = role;
    }

    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    res.status(200).json({
      unreadCount,
      notifications,
    });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ message: 'Lỗi lấy danh sách thông báo.' });
  }
});

// 3. Get unread count
router.get('/unread-count', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const filter = { isRead: false };

    if (userId) {
      filter.$or = [{ userId }, { userId: 'all' }];
    } else if (role) {
      filter.role = role;
    }

    const count = await Notification.countDocuments(filter);
    res.status(200).json({ unreadCount: count });
  } catch (err) {
    console.error('Error getting unread count:', err);
    res.status(500).json({ message: 'Lỗi lấy số lượng thông báo chưa đọc.' });
  }
});

// 4. Mark single notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
    if (!notif) {
      return res.status(404).json({ message: 'Không tìm thấy thông báo.' });
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
    const { userId, role } = req.body;
    const filter = { isRead: false };

    if (userId) {
      filter.$or = [{ userId }, { userId: 'all' }];
    } else if (role) {
      filter.role = role;
    }

    await Notification.updateMany(filter, { isRead: true });
    res.status(200).json({ message: 'Tất cả thông báo đã được đánh dấu đã đọc.' });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ message: 'Lỗi cập nhật thông báo.' });
  }
});

// 6. Delete notification
router.delete('/:id', async (req, res) => {
  try {
    const notif = await Notification.findByIdAndDelete(req.params.id);
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
