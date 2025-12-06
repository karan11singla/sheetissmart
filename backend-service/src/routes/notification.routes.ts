import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All notification routes require authentication
router.use(authenticate);

// Get all notifications for current user
router.get('/', notificationController.getNotifications);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Mark all as read
router.post('/mark-all-read', notificationController.markAllAsRead);

// Mark single notification as read
router.post('/:id/read', notificationController.markAsRead);

export default router;
