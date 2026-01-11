/**
 * Notification utility functions
 */

export type NotificationType = 
  | 'enrollment' 
  | 'course_update' 
  | 'new_lesson' 
  | 'certificate' 
  | 'review' 
  | 'instructor_response' 
  | 'payment' 
  | 'system' 
  | 'comment' 
  | 'comment_reply';

/**
 * Get notification icon based on type
 */
export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    enrollment: '🎓',
    course_update: '📝',
    new_lesson: '📚',
    certificate: '🏆',
    review: '⭐',
    instructor_response: '👨‍🏫',
    payment: '💳',
    system: '⚙️',
    comment: '💬',
    comment_reply: '↩️',
  };
  return icons[type] || '🔔';
}

/**
 * Format notification timestamp
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
