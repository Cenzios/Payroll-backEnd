import express from 'express';
import * as notificationController from '../controllers/notification.controller';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/v1/notifications - Get user notifications
router.get('/', notificationController.getUserNotifications);

// GET /api/v1/notifications/unread-count - Get unread notification count
router.get('/unread-count', notificationController.getUnreadCount);

// PUT /api/v1/notifications/:id/read - Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// DELETE /api/v1/notifications/:id - Soft delete notification
router.delete('/:id', notificationController.deleteNotification);

export default router;
