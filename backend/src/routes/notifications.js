import express from 'express';
import Notification from '../models/Notification.js';

const router = express.Router();


// ─────────────────────────────────────────
// Route 1 — Get All Notifications
// GET /api/notifications
// Returns all notifications for logged in user
// Newest first
// ─────────────────────────────────────────
router.get('/', async (req, res) => {

  try {

    const notifications = await Notification.find({
      userId: req.user.id
    }).sort({ createdAt: -1 });

    // Count unread separately for notification bell badge
    const unreadCount = await Notification.countDocuments({
      userId: req.user.id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      data: {
        unreadCount,
        notifications: notifications.map(n => ({
          notificationId: n._id,
          title: n.title,
          message: n.message,
          type: n.type,
          applicationId: n.applicationId,
          isRead: n.isRead,
          readAt: n.readAt,
          createdAt: n.createdAt
        }))
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// ─────────────────────────────────────────
// Route 2 — Mark One Notification as Read
// PATCH /api/notifications/:id/read
// Called when user taps a notification
// ─────────────────────────────────────────
router.patch('/:id/read', async (req, res) => {

  try {

    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id
      // userId check ensures user can only mark their own notifications
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


// ─────────────────────────────────────────
// Route 3 — Mark All Notifications as Read
// PATCH /api/notifications/read-all
// Called when user clicks mark all as read
// ─────────────────────────────────────────
router.patch('/read-all', async (req, res) => {

  try {

    await Notification.updateMany(
      { userId: req.user.id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    return res.status(200).json({
      success: true,
      message:'All notifications marked as read'
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again.'
    });
  }
});


export default router;