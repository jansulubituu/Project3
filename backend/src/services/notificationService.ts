import { Notification, User, INotification } from '../models';
import mongoose from 'mongoose';

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

interface CreateNotificationData {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  data?: Record<string, string>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(
  data: CreateNotificationData
): Promise<INotification> {
  const notificationData: any = {
    user: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
  };

  if (data.link) {
    notificationData.link = data.link;
  }

  if (data.data) {
    notificationData.data = new Map(Object.entries(data.data));
  }

  return await Notification.createNotification(notificationData);
}

/**
 * Create notifications for multiple users
 */
export async function createNotificationForUsers(
  userIds: mongoose.Types.ObjectId[],
  data: Omit<CreateNotificationData, 'userId'>
): Promise<INotification[]> {
  const notifications = userIds.map((userId) => ({
    user: userId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    data: data.data ? new Map(Object.entries(data.data)) : undefined,
  }));

  return await Notification.insertMany(notifications) as INotification[];
}

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
 * Generate notification link based on type and data
 */
export function getNotificationLink(
  type: NotificationType,
  data?: Record<string, string>
): string | undefined {
  if (!data) return undefined;

  switch (type) {
    case 'comment':
    case 'comment_reply':
      if (data.lessonId && data.courseSlug) {
        return `/courses/${data.courseSlug}/learn/${data.lessonId}`;
      }
      break;
    case 'enrollment':
    case 'payment':
    case 'review':
    case 'instructor_response':
      if (data.courseSlug) {
        return `/courses/${data.courseSlug}`;
      }
      break;
    case 'new_lesson':
      if (data.lessonId && data.courseSlug) {
        return `/courses/${data.courseSlug}/learn/${data.lessonId}`;
      }
      break;
    case 'certificate':
      if (data.certificateId) {
        return `/certificates/verify/${data.certificateId}`;
      }
      break;
  }
  return undefined;
}

/**
 * Create notification for new comment (notify instructor)
 */
export async function createCommentNotification(
  comment: any,
  lesson: any,
  course: any
): Promise<void> {
  try {
    // Don't notify if comment author is the instructor
    if (course.instructor && course.instructor.toString() === comment.author.toString()) {
      return;
    }

    // Get instructor user
    const instructor = await User.findById(course.instructor);
    if (!instructor) return;

    // Get author name
    const author = await User.findById(comment.author).select('fullName');
    if (!author) return;

    await createNotification({
      userId: course.instructor,
      type: 'comment',
      title: 'Bình luận mới',
      message: `${author.fullName} đã bình luận trong bài học '${lesson.title}'`,
      link: `/courses/${course.slug}/learn/${lesson._id}`,
      data: {
        commentId: comment._id.toString(),
        lessonId: lesson._id.toString(),
        courseId: course._id.toString(),
        courseSlug: course.slug,
      },
    });
  } catch (error) {
    console.error('Error in createCommentNotification:', error);
  }
}

/**
 * Create notification for reply (notify parent comment author)
 */
export async function createReplyNotification(
  reply: any,
  parentComment: any,
  lesson: any,
  course: any
): Promise<void> {
  try {
    // Don't notify if reply author is the parent comment author
    if (parentComment.author.toString() === reply.author.toString()) {
      return;
    }

    // Get parent comment author
    const parentAuthor = await User.findById(parentComment.author);
    if (!parentAuthor) return;

    // Get reply author name
    const replyAuthor = await User.findById(reply.author).select('fullName');
    if (!replyAuthor) return;

    await createNotification({
      userId: parentComment.author,
      type: 'comment_reply',
      title: 'Phản hồi bình luận',
      message: `${replyAuthor.fullName} đã phản hồi bình luận của bạn`,
      link: `/courses/${course.slug}/learn/${lesson._id}`,
      data: {
        replyId: reply._id.toString(),
        commentId: parentComment._id.toString(),
        lessonId: lesson._id.toString(),
        courseId: course._id.toString(),
        courseSlug: course.slug,
      },
    });
  } catch (error) {
    console.error('Error in createReplyNotification:', error);
  }
}
