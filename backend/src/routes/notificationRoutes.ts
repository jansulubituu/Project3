import express from 'express';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
  createSystemNotification,
  getAdminNotifications,
  getInstructorNotifications,
  createNotificationForUsers,
  updateNotification,
  deleteNotificationAdmin,
  deleteNotificationInstructor,
} from '../controllers/notificationController';
import { protect } from '../middleware/auth';
import { adminOnly, instructorOrAdmin } from '../middleware/authorize';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/notifications - Get notifications with pagination
router.get('/', getNotifications);

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/:notificationId/read - Mark as read
router.put('/:notificationId/read', markAsRead);

// PUT /api/notifications/read-all - Mark all as read
router.put('/read-all', markAllAsRead);

// DELETE /api/notifications/:notificationId - Delete notification
router.delete('/:notificationId', deleteNotification);

// DELETE /api/notifications/read - Delete all read notifications
router.delete('/read', deleteReadNotifications);

// Admin only routes
// POST /api/notifications/system - Create system notification
router.post('/system', adminOnly, createSystemNotification);
// GET /api/notifications/admin - Get all notifications (Admin)
router.get('/admin', adminOnly, getAdminNotifications);
// DELETE /api/notifications/:id/admin - Delete notification (Admin)
router.delete('/:id/admin', adminOnly, deleteNotificationAdmin);

// Instructor/Admin routes
// GET /api/notifications/instructor - Get notifications for instructor's courses
router.get('/instructor', instructorOrAdmin, getInstructorNotifications);
// POST /api/notifications - Create notification for specific users
router.post('/', instructorOrAdmin, createNotificationForUsers);
// PUT /api/notifications/:id - Update notification
router.put('/:id', instructorOrAdmin, updateNotification);
// DELETE /api/notifications/:id/instructor - Delete notification (Instructor)
router.delete('/:id/instructor', instructorOrAdmin, deleteNotificationInstructor);

export default router;
