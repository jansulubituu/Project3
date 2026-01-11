'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getNotificationIcon, formatNotificationTime, NotificationType } from '@/lib/notificationUtils';
import { X } from 'lucide-react';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationItemProps {
  notification: Notification;
  onUpdate: () => void;
}

export default function NotificationItem({ notification, onUpdate }: NotificationItemProps) {
  const router = useRouter();
  const [markingRead, setMarkingRead] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleClick = async () => {
    // Mark as read if unread
    if (!notification.isRead && !markingRead) {
      try {
        setMarkingRead(true);
        await api.put(`/notifications/${notification._id}/read`);
        onUpdate();
      } catch (err) {
        console.error('Error marking notification as read:', err);
      } finally {
        setMarkingRead(false);
      }
    }

    // Navigate if link exists
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick

    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) return;

    try {
      setDeleting(true);
      await api.delete(`/notifications/${notification._id}`);
      onUpdate();
    } catch (err) {
      console.error('Error deleting notification:', err);
      alert('Không thể xóa thông báo. Vui lòng thử lại.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer relative group ${
        !notification.isRead ? 'bg-blue-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="flex-shrink-0 text-lg">
          {getNotificationIcon(notification.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {formatNotificationTime(notification.createdAt)}
              </p>
            </div>

            {/* Unread indicator */}
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0 mt-1.5" />
            )}
          </div>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 p-1 hover:bg-red-100 rounded text-gray-400 hover:text-red-600 disabled:opacity-50"
          aria-label="Xóa thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
