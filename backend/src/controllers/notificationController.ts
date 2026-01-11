import { Response } from 'express';
import mongoose from 'mongoose';
import { Notification, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUsers as createNotificationForUsersService } from '../services/notificationService';

/**
 * @desc    Get notifications for current user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { page = '1', limit = '20', type, isRead } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build query
    const query: any = {
      user: req.user.id,
    };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Get notifications and total count
    const [notifications, totalItems, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({
        user: req.user.id,
        isRead: false,
      }),
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(totalItems / parsedLimit),
        totalItems,
        itemsPerPage: parsedLimit,
      },
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const unreadCount = await Notification.countDocuments({
      user: req.user.id,
      isRead: false,
    });

    res.json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching unread count',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Mark a notification as read
 * @route   PUT /api/notifications/:notificationId/read
 * @access  Private
 */
export const markAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this notification',
      });
    }

    // Mark as read
    await notification.markAsRead();

    res.json({
      success: true,
      notification: {
        _id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt,
      },
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking notification as read',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
export const markAllAsRead = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await Notification.markAllAsRead(new mongoose.Types.ObjectId(req.user.id));

    res.json({
      success: true,
      count: result.modifiedCount || 0,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking all notifications as read',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:notificationId
 * @access  Private
 */
export const deleteNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { notificationId } = req.params;

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check ownership
    if (notification.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this notification',
      });
    }

    await Notification.findByIdAndDelete(notificationId);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete all read notifications
 * @route   DELETE /api/notifications/read
 * @access  Private
 */
export const deleteReadNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const result = await Notification.deleteMany({
      user: req.user.id,
      isRead: true,
    });

    res.json({
      success: true,
      count: result.deletedCount || 0,
    });
  } catch (error) {
    console.error('Error deleting read notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting read notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Create system notification (Admin only)
 * @route   POST /api/notifications/system
 * @access  Private/Admin
 */
export const createSystemNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can create system notifications',
      });
    }

    const { title, message, link, userIds, sendToAll } = req.body;

    // Validation
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required',
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 500 characters or less',
      });
    }

    let targetUserIds: mongoose.Types.ObjectId[] = [];

    if (sendToAll === true) {
      // Get all active users
      const users = await User.find({ isActive: true }).select('_id');
      targetUserIds = users.map((u) => u._id);
    } else if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      // Validate and convert user IDs
      const validUserIds = userIds.filter((id: string) =>
        mongoose.Types.ObjectId.isValid(id)
      );
      if (validUserIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one valid user ID is required',
        });
      }
      targetUserIds = validUserIds.map((id: string) => new mongoose.Types.ObjectId(id));
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either sendToAll must be true or userIds array must be provided',
      });
    }

    if (targetUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No users found to send notification to',
      });
    }

    // Create notifications for all target users
    const notifications = await createNotificationForUsersService(targetUserIds, {
      type: 'system',
      title,
      message,
      link: link || undefined,
      data: {
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
      },
    });

    res.status(201).json({
      success: true,
      message: `System notification created and sent to ${notifications.length} user(s)`,
      notificationCount: notifications.length,
    });
  } catch (error) {
    console.error('Error creating system notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating system notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get all notifications (Admin only)
 * @route   GET /api/notifications/admin
 * @access  Private/Admin
 */
export const getAdminNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can access this endpoint',
      });
    }

    const { page = '1', limit = '20', type, isRead, userId, search } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build query
    const query: any = {};

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId as string)) {
      query.user = new mongoose.Types.ObjectId(userId as string);
    }

    if (search) {
      query.$or = [
        { title: { $regex: search as string, $options: 'i' } },
        { message: { $regex: search as string, $options: 'i' } },
      ];
    }

    // Get notifications with user info
    const [notifications, totalItems] = await Promise.all([
      Notification.find(query)
        .populate('user', 'fullName email avatar role')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(totalItems / parsedLimit),
        totalItems,
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching admin notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get notifications for instructor's courses (Instructor only)
 * @route   GET /api/notifications/instructor
 * @access  Private/Instructor
 */
export const getInstructorNotifications = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can access this endpoint',
      });
    }

    const { page = '1', limit = '20', type, isRead, courseId, studentId } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    // Get instructor's courses
    const Course = mongoose.model('Course');
    const courseQuery: any = { instructor: req.user.id };
    if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
      courseQuery._id = new mongoose.Types.ObjectId(courseId as string);
    }
    const courses = await Course.find(courseQuery).select('_id');
    const courseIds = courses.map((c) => c._id);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        notifications: [],
        pagination: {
          currentPage: parsedPage,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parsedLimit,
        },
      });
    }

    // Get enrollments for instructor's courses
    const Enrollment = mongoose.model('Enrollment');
    const enrollmentQuery: any = { course: { $in: courseIds } };
    if (studentId && mongoose.Types.ObjectId.isValid(studentId as string)) {
      enrollmentQuery.student = new mongoose.Types.ObjectId(studentId as string);
    }
    const enrollments = await Enrollment.find(enrollmentQuery).select('student');
    const studentIds = [...new Set(enrollments.map((e: any) => e.student.toString()))];

    if (studentIds.length === 0) {
      return res.json({
        success: true,
        notifications: [],
        pagination: {
          currentPage: parsedPage,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: parsedLimit,
        },
      });
    }

    // Build notification query
    const query: any = {
      user: { $in: studentIds.map((id) => new mongoose.Types.ObjectId(id)) },
    };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Get notifications
    const [notifications, totalItems] = await Promise.all([
      Notification.find(query)
        .populate('user', 'fullName email avatar role')
        .sort({ createdAt: -1 })
        .limit(parsedLimit)
        .skip(skip)
        .lean(),
      Notification.countDocuments(query),
    ]);

    res.json({
      success: true,
      notifications,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(totalItems / parsedLimit),
        totalItems,
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching instructor notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Create notification for specific users (Admin/Instructor)
 * @route   POST /api/notifications
 * @access  Private/Admin/Instructor
 */
export const createNotificationForUsers = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { userIds, type, title, message, link } = req.body;

    // Validation
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'userIds array is required',
      });
    }

    if (!type || !title || !message) {
      return res.status(400).json({
        success: false,
        message: 'type, title, and message are required',
      });
    }

    if (title.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 500 characters or less',
      });
    }

    // Validate user IDs
    const validUserIds = userIds.filter((id: string) =>
      mongoose.Types.ObjectId.isValid(id)
    );
    if (validUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one valid user ID is required',
      });
    }

    // For instructors, check if users are enrolled in their courses
    if (req.user.role === 'instructor') {
      const Enrollment = mongoose.model('Enrollment');
      const Course = mongoose.model('Course');
      
      // Get instructor's courses
      const courses = await Course.find({ instructor: req.user.id }).select('_id');
      const courseIds = courses.map((c) => c._id);

      if (courseIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You have no courses. Cannot send notifications.',
        });
      }

      // Check if all users are enrolled in instructor's courses
      const enrollments = await Enrollment.find({
        course: { $in: courseIds },
        student: { $in: validUserIds.map((id: string) => new mongoose.Types.ObjectId(id)) },
      }).select('student');

      const enrolledStudentIds = [...new Set(enrollments.map((e: any) => e.student.toString()))];
      const requestedUserIds = validUserIds.map((id: string) => id.toString());

      // Check if all requested users are enrolled
      const allEnrolled = requestedUserIds.every((id) => enrolledStudentIds.includes(id));
      if (!allEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You can only send notifications to students enrolled in your courses',
        });
      }
    }

    // Create notifications
    const targetUserIds = validUserIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const notifications = await createNotificationForUsersService(targetUserIds, {
      type,
      title,
      message,
      link: link || undefined,
      data: {
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
      },
    });

    res.status(201).json({
      success: true,
      message: `Notification created and sent to ${notifications.length} user(s)`,
      notificationCount: notifications.length,
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Update notification (Admin/Instructor)
 * @route   PUT /api/notifications/:id
 * @access  Private/Admin/Instructor
 */
export const updateNotification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { id } = req.params;
    const { title, message, link } = req.body;

    const notification = await Notification.findById(id).populate('user', 'fullName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Admin can update any notification
    if (req.user.role === 'admin') {
      // Admin can update any notification
    } else if (req.user.role === 'instructor') {
      // Instructor can only update notifications for students in their courses
      const Enrollment = mongoose.model('Enrollment');
      const Course = mongoose.model('Course');
      
      const courses = await Course.find({ instructor: req.user.id }).select('_id');
      const courseIds = courses.map((c) => c._id);

      if (courseIds.length === 0) {
        return res.status(403).json({
          success: false,
          message: 'You have no courses',
        });
      }

      const enrollment = await Enrollment.findOne({
        course: { $in: courseIds },
        student: notification.user,
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You can only update notifications for students enrolled in your courses',
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Only admins and instructors can update notifications',
      });
    }

    // Validation
    if (title !== undefined) {
      if (!title || title.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Title cannot be empty',
        });
      }
      if (title.length > 200) {
        return res.status(400).json({
          success: false,
          message: 'Title must be 200 characters or less',
        });
      }
      notification.title = title;
    }

    if (message !== undefined) {
      if (!message || message.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Message cannot be empty',
        });
      }
      if (message.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Message must be 500 characters or less',
        });
      }
      notification.message = message;
    }

    if (link !== undefined) {
      if (link && link.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Link must be 500 characters or less',
        });
      }
      notification.link = link || undefined;
    }

    await notification.save();

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete notification (Admin only)
 * @route   DELETE /api/notifications/:id/admin
 * @access  Private/Admin
 */
export const deleteNotificationAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can delete notifications',
      });
    }

    const { id } = req.params;

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete notification (Instructor only)
 * @route   DELETE /api/notifications/:id/instructor
 * @access  Private/Instructor
 */
export const deleteNotificationInstructor = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || (req.user.role !== 'instructor' && req.user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only instructors can delete notifications',
      });
    }

    const { id } = req.params;

    const notification = await Notification.findById(id).populate('user', 'fullName email');

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Admin can delete any notification
    if (req.user.role === 'admin') {
      await Notification.findByIdAndDelete(id);
      return res.json({
        success: true,
        message: 'Notification deleted',
      });
    }

    // Instructor can only delete notifications for students in their courses
    const Enrollment = mongoose.model('Enrollment');
    const Course = mongoose.model('Course');
    
    const courses = await Course.find({ instructor: req.user.id }).select('_id');
    const courseIds = courses.map((c) => c._id);

    if (courseIds.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'You have no courses',
      });
    }

    const enrollment = await Enrollment.findOne({
      course: { $in: courseIds },
      student: notification.user,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete notifications for students enrolled in your courses',
      });
    }

    await Notification.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting notification',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
