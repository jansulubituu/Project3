import { Response } from 'express';
import mongoose from 'mongoose';
import { Notification, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUsers as createNotificationForUsersService } from '../services/notificationService';
import { getAvailableGroups, getGroupUsers, validateGroupAccess } from '../services/userGroupService';

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

    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID',
      });
    }

    const notification = await Notification.findById(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check ownership - Convert both to string for comparison
    // Handle both ObjectId and string types
    const notificationUserId = notification.user.toString();
    const currentUserId = req.user.id.toString();

    // Also allow admin/instructor to mark notifications as read if they created them
    // (for admin/instructor notification management pages)
    const isOwner = notificationUserId === currentUserId;
    const isCreator = req.user.role === 'admin' || req.user.role === 'instructor';
    let isCreatorOfNotification = false;

    if (isCreator && notification.data) {
      const dataObj = notification.data instanceof Map 
        ? Object.fromEntries(notification.data) 
        : notification.data;
      const createdBy = dataObj?.createdBy || dataObj?.get?.('createdBy');
      if (createdBy && createdBy.toString() === currentUserId) {
        isCreatorOfNotification = true;
      }
    }

    if (!isOwner && !isCreatorOfNotification) {
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
    const trimmedTitle = title?.trim();
    const trimmedMessage = message?.trim();
    const trimmedLink = link?.trim();

    if (!trimmedTitle || trimmedTitle.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title is required and cannot be empty',
      });
    }

    if (trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (!trimmedMessage || trimmedMessage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required and cannot be empty',
      });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 500 characters or less',
      });
    }

    if (trimmedLink) {
      if (trimmedLink.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Link must be 500 characters or less',
        });
      }

      // Validate URL format (allow absolute URLs and relative paths starting with /)
      try {
        new URL(trimmedLink);
      } catch {
        if (!trimmedLink.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Link must be a valid URL or a relative path starting with /',
          });
        }
      }
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

    // Generate batch ID for grouping notifications
    const batchId = new mongoose.Types.ObjectId().toString();

    // Create notifications for all target users
    const notifications = await createNotificationForUsersService(targetUserIds, {
      type: 'system',
      title: trimmedTitle,
      message: trimmedMessage,
      link: trimmedLink || undefined,
      data: {
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        batchId: batchId,
        recipientCount: targetUserIds.length.toString(),
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

    const { page = '1', limit = '20', type, isRead, userId, search, dateFrom, dateTo } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    // Build query - Admin chỉ xem notifications do admin này tạo
    const query: any = {
      'data.createdBy': req.user.id.toString(), // Filter by creator
    };

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

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        // Include the entire day
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = endDate;
      }
    }

    // Date range filter
    if (req.query.dateFrom || req.query.dateTo) {
      query.createdAt = {};
      if (req.query.dateFrom) {
        query.createdAt.$gte = new Date(req.query.dateFrom as string);
      }
      if (req.query.dateTo) {
        // Add 23:59:59 to include the entire day
        const dateTo = new Date(req.query.dateTo as string);
        dateTo.setHours(23, 59, 59, 999);
        query.createdAt.$lte = dateTo;
      }
    }

    // Date range filter
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        query.createdAt.$gte = new Date(dateFrom as string);
      }
      if (dateTo) {
        const endDate = new Date(dateTo as string);
        endDate.setHours(23, 59, 59, 999); // Include entire end date
        query.createdAt.$lte = endDate;
      }
    }

    // Get all notifications first
    const allNotifications = await Notification.find(query)
      .populate('user', 'fullName email avatar role')
      .sort({ createdAt: -1 })
      .lean();

    // Group notifications by batchId (for batch notifications) or by individual notification
    // When using .lean(), Map is converted to plain object
    const groupedNotifications = new Map<string, any>();
    
    allNotifications.forEach((notif: any) => {
      // Access data as plain object (lean() converts Map to object)
      const dataObj = notif.data || {};
      const batchId = dataObj.batchId;
      
      if (batchId) {
        // This is a batch notification - group by batchId
        if (!groupedNotifications.has(batchId)) {
          // Use the first notification as representative, but add recipientCount
          const representative = { ...notif };
          const recipientCount = dataObj.recipientCount || '0';
          representative.recipientCount = parseInt(recipientCount, 10);
          representative.isBatch = true;
          // Remove user info for batch notifications (sent to multiple users)
          delete representative.user;
          groupedNotifications.set(batchId, representative);
        }
      } else {
        // Individual notification - use _id as key
        groupedNotifications.set(notif._id.toString(), { ...notif, isBatch: false });
      }
    });

    // Convert map to array and sort by createdAt
    const uniqueNotifications = Array.from(groupedNotifications.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination
    const paginatedNotifications = uniqueNotifications.slice(skip, skip + parsedLimit);
    const totalItems = uniqueNotifications.length;

    res.json({
      success: true,
      notifications: paginatedNotifications,
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

    // Optimize: Use aggregation pipeline to get student IDs in one query
    const Enrollment = mongoose.model('Enrollment');

    // Build course match stage
    const courseMatch: any = { instructor: req.user.id };
    if (courseId && mongoose.Types.ObjectId.isValid(courseId as string)) {
      courseMatch._id = new mongoose.Types.ObjectId(courseId as string);
    }

    // Use aggregation to get student IDs efficiently
    const enrollmentAggregation: any[] = [
      {
        $lookup: {
          from: 'courses',
          localField: 'course',
          foreignField: '_id',
          as: 'courseInfo',
        },
      },
      {
        $match: {
          'courseInfo.instructor': req.user.id,
          ...(courseId && mongoose.Types.ObjectId.isValid(courseId as string)
            ? { course: new mongoose.Types.ObjectId(courseId as string) }
            : {}),
          ...(studentId && mongoose.Types.ObjectId.isValid(studentId as string)
            ? { student: new mongoose.Types.ObjectId(studentId as string) }
            : {}),
        },
      },
      {
        $group: {
          _id: '$student',
        },
      },
    ];

    const enrollmentResults = await Enrollment.aggregate(enrollmentAggregation);
    const studentIds = enrollmentResults.map((e) => e._id);

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
      user: { $in: studentIds },
    };

    if (type) {
      query.type = type;
    }

    if (isRead !== undefined) {
      query.isRead = isRead === 'true';
    }

    // Get notifications with pagination
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

    const { userIds, groupIds, type, title, message, link, recipientType } = req.body;

    // Validation: At least one of userIds or groupIds must be provided
    const hasUserIds = userIds && Array.isArray(userIds) && userIds.length > 0;
    const hasGroupIds = groupIds && Array.isArray(groupIds) && groupIds.length > 0;

    if (!hasUserIds && !hasGroupIds) {
      return res.status(400).json({
        success: false,
        message: 'Either userIds or groupIds (or both) must be provided',
      });
    }

    // Validate type enum
    const validTypes = [
      'enrollment',
      'course_update',
      'new_lesson',
      'certificate',
      'review',
      'instructor_response',
      'payment',
      'system',
      'comment',
      'comment_reply',
    ];
    if (!type || !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `type is required and must be one of: ${validTypes.join(', ')}`,
      });
    }

    const trimmedTitle = title?.trim();
    const trimmedMessage = message?.trim();
    const trimmedLink = link?.trim();

    if (!trimmedTitle || trimmedTitle.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'title is required and cannot be empty',
      });
    }

    if (trimmedTitle.length > 200) {
      return res.status(400).json({
        success: false,
        message: 'Title must be 200 characters or less',
      });
    }

    if (!trimmedMessage || trimmedMessage.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'message is required and cannot be empty',
      });
    }

    if (trimmedMessage.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Message must be 500 characters or less',
      });
    }

    if (trimmedLink) {
      if (trimmedLink.length > 500) {
        return res.status(400).json({
          success: false,
          message: 'Link must be 500 characters or less',
        });
      }

      // Validate URL format (allow absolute URLs and relative paths starting with /)
      try {
        new URL(trimmedLink);
      } catch {
        if (!trimmedLink.startsWith('/')) {
          return res.status(400).json({
            success: false,
            message: 'Link must be a valid URL or a relative path starting with /',
          });
        }
      }
    }

    // Validate and collect user IDs from userIds
    let validUserIds: string[] = [];
    if (hasUserIds) {
      validUserIds = userIds.filter((id: string) =>
        mongoose.Types.ObjectId.isValid(id)
      );
    }

    // Get users from groups
    let groupUserIds: mongoose.Types.ObjectId[] = [];
    if (hasGroupIds) {
      // Validate group access
      for (const groupId of groupIds) {
        if (!validateGroupAccess(req.user.role, req.user.id, groupId)) {
          return res.status(403).json({
            success: false,
            message: `You do not have access to group: ${groupId}`,
          });
        }
      }

      // Get users from all groups
      const groupUserPromises = groupIds.map((groupId: string) =>
        getGroupUsers(groupId, req.user.id, req.user.role)
      );
      const groupUsersArrays = await Promise.all(groupUserPromises);
      groupUserIds = groupUsersArrays.flat();
    }

    // Merge userIds and groupUserIds, remove duplicates
    const allUserIdsSet = new Set<string>();
    
    // Add individual user IDs
    validUserIds.forEach((id) => allUserIdsSet.add(id.toString()));
    
    // Add group user IDs
    groupUserIds.forEach((id) => allUserIdsSet.add(id.toString()));

    const finalUserIds = Array.from(allUserIdsSet);

    if (finalUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid users found from provided userIds and groupIds',
      });
    }

    // For instructors, validate recipients (only if using userIds, not groups)
    // Groups are already validated in getGroupUsers
    if (req.user.role === 'instructor' && hasUserIds) {
      const Enrollment = mongoose.model('Enrollment');
      const Course = mongoose.model('Course');
      const User = mongoose.model('User');
      
      // If recipientType is 'admin', get all admins
      if (recipientType === 'admin') {
        const admins = await User.find({ role: 'admin' }).select('_id');
        const adminIds = admins.map((a) => a._id.toString());
        const requestedUserIds = validUserIds.map((id: string) => id.toString());
        
        // Check if all requested users are admins
        const allAdmins = requestedUserIds.every((id) => adminIds.includes(id));
        if (!allAdmins) {
          return res.status(403).json({
            success: false,
            message: 'You can only send notifications to admins when recipientType is "admin"',
          });
        }
      } else {
        // For students, check if users are enrolled in instructor's courses
        const courses = await Course.find({ instructor: req.user.id }).select('_id');
        const courseIds = courses.map((c) => c._id);

        if (courseIds.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'You have no courses. Cannot send notifications to students.',
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
    }

    // Generate batch ID for grouping notifications (only for admin)
    const batchId = req.user.role === 'admin' ? new mongoose.Types.ObjectId().toString() : undefined;

    // Create notifications
    const targetUserIds = finalUserIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const notificationData: any = {
      type,
      title: trimmedTitle,
      message: trimmedMessage,
      link: trimmedLink || undefined,
      data: {
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
      },
    };

    // Add batchId and recipientCount for admin notifications
    if (batchId) {
      notificationData.data.batchId = batchId;
      notificationData.data.recipientCount = targetUserIds.length.toString();
    }

    const notifications = await createNotificationForUsersService(targetUserIds, notificationData);

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

    // Check if this is a batch notification (admin cannot update batch notifications)
    const dataObj = (notification as any).data || {};
    const batchId = dataObj.get ? dataObj.get('batchId') : dataObj.batchId;

    if (batchId && req.user.role === 'admin') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update batch notifications. Please delete and create a new one.',
      });
    }

    // Admin can update any notification (except batch)
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

    const notification = await Notification.findById(id).lean();

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found',
      });
    }

    // Check if this is a batch notification
    const dataObj = (notification as any).data || {};
    const batchId = dataObj.batchId;

    if (batchId) {
      // Delete all notifications in this batch
      const result = await Notification.deleteMany({
        'data.batchId': batchId,
        'data.createdBy': req.user.id.toString(),
      });

      res.json({
        success: true,
        message: `Deleted ${result.deletedCount} notification(s) from batch`,
        deletedCount: result.deletedCount,
      });
    } else {
      // Delete single notification
      await Notification.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'Notification deleted',
        deletedCount: 1,
      });
    }
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

/**
 * @desc    Get available user groups for notification
 * @route   GET /api/notifications/groups
 * @access  Private/Admin/Instructor
 */
export const getNotificationGroups = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const groups = await getAvailableGroups(req.user.role, req.user.id);

    res.json({
      success: true,
      groups,
    });
  } catch (error) {
    console.error('Error fetching notification groups:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification groups',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
