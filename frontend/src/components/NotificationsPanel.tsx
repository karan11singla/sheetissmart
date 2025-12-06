import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../services/api';
import type { Notification } from '../types';

interface NotificationsPanelProps {
  onClose: () => void;
  onNavigateToComment?: (sheetId: string, rowId: string) => void;
}

export default function NotificationsPanel({ onClose, onNavigateToComment }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => notificationApi.getAll(),
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: notificationApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: notificationApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getNotificationMessage = (notification: Notification) => {
    switch (notification.type) {
      case 'MENTION':
        return (
          <>
            <span className="font-medium">{notification.fromUser.name}</span>
            {' mentioned you in a comment'}
            {notification.comment?.row?.sheet?.name && (
              <> on <span className="font-medium">{notification.comment.row.sheet.name}</span></>
            )}
          </>
        );
      case 'COMMENT':
        return (
          <>
            <span className="font-medium">{notification.fromUser.name}</span>
            {' commented on your sheet'}
          </>
        );
      case 'SHARE':
        return (
          <>
            <span className="font-medium">{notification.fromUser.name}</span>
            {' shared a sheet with you'}
          </>
        );
      default:
        return 'New notification';
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsReadMutation.mutate(notification.id);
    }

    // Navigate to the relevant location
    if (notification.sheetId) {
      onClose();
      navigate(`/sheet/${notification.sheetId}`);

      // If it's a comment mention, also trigger the comment sidebar
      if (notification.type === 'MENTION' && notification.rowId && onNavigateToComment) {
        setTimeout(() => {
          onNavigateToComment(notification.sheetId!, notification.rowId!);
        }, 100);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-slate-600" />
          <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
            className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center space-x-1"
          >
            <CheckCheck className="h-4 w-4" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500">
            <div className="animate-pulse">Loading notifications...</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs mt-1 text-slate-400">
              You'll see mentions and updates here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-6 py-4 text-left hover:bg-slate-50 transition-colors flex items-start space-x-3 ${
                  !notification.isRead ? 'bg-indigo-50/50' : ''
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                  notification.type === 'MENTION' ? 'bg-indigo-100' : 'bg-slate-100'
                }`}>
                  {notification.type === 'MENTION' ? (
                    <MessageSquare className="h-5 w-5 text-indigo-600" />
                  ) : (
                    <Bell className="h-5 w-5 text-slate-600" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    {getNotificationMessage(notification)}
                  </p>
                  {notification.comment?.content && (
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      "{notification.comment.content}"
                    </p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>

                {/* Unread indicator */}
                {!notification.isRead && (
                  <div className="flex-shrink-0">
                    <div className="h-2 w-2 bg-indigo-500 rounded-full" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
