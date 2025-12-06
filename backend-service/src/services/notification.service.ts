import prisma from '../config/database';
import { NotificationType } from '@prisma/client';

interface CreateNotificationInput {
  userId: string;
  fromUserId: string;
  type: NotificationType;
  sheetId?: string;
  rowId?: string;
  commentId?: string;
}

/**
 * Create a notification for a user
 */
export async function createNotification(data: CreateNotificationInput) {
  // Don't create notification if user is notifying themselves
  if (data.userId === data.fromUserId) {
    return null;
  }

  const notification = await prisma.notification.create({
    data: {
      userId: data.userId,
      fromUserId: data.fromUserId,
      type: data.type,
      sheetId: data.sheetId,
      rowId: data.rowId,
      commentId: data.commentId,
    },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      comment: {
        select: { id: true, content: true },
      },
    },
  });

  return notification;
}

/**
 * Create notifications for all mentioned users in a comment
 */
export async function createMentionNotifications(
  commentContent: string,
  commentId: string,
  sheetId: string,
  rowId: string,
  fromUserId: string
) {
  // Extract @mentions from comment content
  // Matches @Name (captures until space or end) or @"Full Name" patterns
  // Also handles names with spaces by looking for known users
  const mentions: string[] = [];

  // First, get all users to match against
  const allUsers = await prisma.user.findMany({
    select: { id: true, name: true },
  });

  // Check if any user's name appears after @ in the content
  for (const user of allUsers) {
    // Create a pattern that matches @Username (case-insensitive)
    const userPattern = new RegExp(`@${user.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (userPattern.test(commentContent)) {
      mentions.push(user.name);
    }
  }

  if (mentions.length === 0) {
    return [];
  }

  // Find users by name (case-insensitive)
  const mentionedUsers = await prisma.user.findMany({
    where: {
      name: {
        in: mentions,
        mode: 'insensitive',
      },
    },
    select: { id: true, name: true },
  });

  // Create notifications for each mentioned user
  const notifications = await Promise.all(
    mentionedUsers.map((user) =>
      createNotification({
        userId: user.id,
        fromUserId,
        type: 'MENTION',
        sheetId,
        rowId,
        commentId,
      })
    )
  );

  return notifications.filter(Boolean);
}

/**
 * Get all notifications for a user
 */
export async function getNotifications(userId: string, options?: { unreadOnly?: boolean }) {
  const where: any = { userId };

  if (options?.unreadOnly) {
    where.isRead = false;
  }

  const notifications = await prisma.notification.findMany({
    where,
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      comment: {
        select: {
          id: true,
          content: true,
          row: {
            select: {
              id: true,
              position: true,
              sheet: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to last 50 notifications
  });

  return notifications;
}

/**
 * Get unread notification count for a user
 */
export async function getUnreadCount(userId: string) {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });

  return count;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string, userId: string) {
  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId, // Ensure user owns the notification
    },
    data: {
      isRead: true,
    },
  });

  return notification;
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllAsRead(userId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
    },
  });

  return result;
}
