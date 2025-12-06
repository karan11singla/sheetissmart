import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';

/**
 * Get all notifications for the current user
 */
export async function getNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const unreadOnly = req.query.unreadOnly === 'true';

    const notifications = await notificationService.getNotifications(userId, { unreadOnly });

    res.status(200).json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    const count = await notificationService.getUnreadCount(userId);

    res.status(200).json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark a notification as read
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    await notificationService.markAsRead(id, userId);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;

    await notificationService.markAllAsRead(userId);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
}
