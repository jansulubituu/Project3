import { Response } from 'express';
import { Comment, Lesson, Enrollment, User } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createCommentNotification, createReplyNotification } from '../services/notificationService';

/**
 * @desc    Get comments for a lesson
 * @route   GET /api/comments/lesson/:lessonId
 * @access  Private (enrolled students)
 */
export const getLessonComments = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { lessonId } = req.params;
    const { page = '1', limit = '20', sort = 'newest' } = req.query;

    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    // Check if lesson exists and is published
    const lesson = await Lesson.findById(lessonId).populate('course');
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (!lesson.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Lesson is not published',
      });
    }

    // Check enrollment (unless admin/instructor)
    // Allow both 'active' and 'completed' enrollments to view comments
    const course = lesson.course as any;
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: { $in: ['active', 'completed'] },
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to view comments',
        });
      }
    }

    // Build sort query
    let sortQuery: any = {};
    if (sort === 'oldest') {
      sortQuery = { createdAt: 1 };
    } else {
      sortQuery = { createdAt: -1 }; // newest (default)
    }

    // Get top-level comments (parentComment is null or doesn't exist)
    const [topLevelComments, totalComments] = await Promise.all([
      Comment.find({
        lesson: lessonId,
        $or: [
          { parentComment: { $exists: false } },
          { parentComment: null },
        ],
        status: 'active',
      })
        .populate('author', 'fullName avatar role')
        .sort(sortQuery)
        .limit(parsedLimit)
        .skip(skip)
        .lean(),
      Comment.countDocuments({
        lesson: lessonId,
        $or: [
          { parentComment: { $exists: false } },
          { parentComment: null },
        ],
        status: 'active',
      }),
    ]);

    // Get replies for each comment
    const commentIds = topLevelComments.map((c: any) => c._id);
    const replies = await Comment.find({
      parentComment: { $in: commentIds },
      status: 'active',
    })
      .populate('author', 'fullName avatar role')
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by parent comment
    const repliesMap: Record<string, any[]> = {};
    replies.forEach((reply: any) => {
      const parentId = reply.parentComment.toString();
      if (!repliesMap[parentId]) {
        repliesMap[parentId] = [];
      }
      repliesMap[parentId].push(reply);
    });

    // Format comments with replies and user-specific data
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const formattedComments = topLevelComments.map((comment: any) => {
      const isLiked = comment.likes?.some(
        (likeId: any) => likeId.toString() === req.user!.id
      ) || false;

      const canEdit = comment.author._id.toString() === req.user!.id;
      const canDelete =
        canEdit ||
        req.user!.role === 'admin' ||
        (req.user!.role === 'instructor' && course.instructor.toString() === req.user!.id);

      return {
        _id: comment._id,
        content: comment.content,
        author: {
          _id: comment.author._id,
          fullName: comment.author.fullName,
          avatar: comment.author.avatar,
          role: comment.author.role,
        },
        likeCount: comment.likeCount || 0,
        isLiked,
        isEdited: comment.isEdited || false,
        editedAt: comment.editedAt,
        createdAt: comment.createdAt,
        replies: (repliesMap[comment._id.toString()] || []).map((reply: any) => {
          const replyIsLiked = reply.likes?.some(
            (likeId: any) => likeId.toString() === req.user!.id
          ) || false;
          return {
            _id: reply._id,
            content: reply.content,
            author: {
              _id: reply.author._id,
              fullName: reply.author.fullName,
              avatar: reply.author.avatar,
              role: reply.author.role,
            },
            likeCount: reply.likeCount || 0,
            isLiked: replyIsLiked,
            isEdited: reply.isEdited || false,
            editedAt: reply.editedAt,
            createdAt: reply.createdAt,
          };
        }),
        replyCount: repliesMap[comment._id.toString()]?.length || 0,
        canEdit,
        canDelete,
      };
    });

    res.json({
      success: true,
      comments: formattedComments,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(totalComments / parsedLimit),
        totalItems: totalComments,
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Create a comment on a lesson
 * @route   POST /api/comments/lesson/:lessonId
 * @access  Private (enrolled students)
 */
export const createComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { lessonId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot exceed 2000 characters',
      });
    }

    // Check if lesson exists and is published
    const lesson = await Lesson.findById(lessonId).populate({
      path: 'course',
      select: 'instructor slug title',
    });
    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    if (!lesson.isPublished) {
      return res.status(403).json({
        success: false,
        message: 'Lesson is not published',
      });
    }

    // Check enrollment
    // Allow both 'active' and 'completed' enrollments to comment
    const course = lesson.course as any;
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: { $in: ['active', 'completed'] },
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to comment',
        });
      }
    }

    // Get user role
    const user = await User.findById(req.user.id).select('role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create comment
    const comment = new Comment({
      lesson: lessonId,
      course: course._id,
      author: req.user.id,
      authorRole: user.role,
      content: content.trim(),
      likes: [],
      likeCount: 0,
      status: 'active',
    });

    await comment.save();
    await comment.populate('author', 'fullName avatar role');

    // Create notification for instructor (async, don't wait)
    createCommentNotification(comment, lesson, course).catch((err) => {
      console.error('Error creating comment notification:', err);
    });

    res.status(201).json({
      success: true,
      comment: {
        _id: comment._id,
        content: comment.content,
        author: {
          _id: comment.author._id,
          fullName: (comment.author as any).fullName,
          avatar: (comment.author as any).avatar,
          role: (comment.author as any).role,
        },
        likeCount: 0,
        isLiked: false,
        isEdited: false,
        createdAt: comment.createdAt,
        replies: [],
        replyCount: 0,
        canEdit: true,
        canDelete: true,
      },
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Reply to a comment
 * @route   POST /api/comments/:commentId/reply
 * @access  Private (enrolled students)
 */
export const replyToComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot exceed 2000 characters',
      });
    }

    // Check if parent comment exists and is top-level
    const parentComment = await Comment.findById(commentId).populate({
      path: 'lesson',
      populate: { path: 'course' },
    });

    if (!parentComment) {
      return res.status(404).json({
        success: false,
        message: 'Parent comment not found',
      });
    }

    if (parentComment.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Cannot reply to deleted comment',
      });
    }

    // Check if parent is top-level (not a reply itself)
    if (parentComment.parentComment) {
      return res.status(400).json({
        success: false,
        message: 'Cannot reply to a reply. Only top-level comments can have replies.',
      });
    }

    const lesson = parentComment.lesson as any;
    const course = lesson.course as any;

    // Check enrollment
    // Allow both 'active' and 'completed' enrollments to reply
    if (req.user.role === 'student') {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: { $in: ['active', 'completed'] },
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in this course to reply',
        });
      }
    }

    // Get user role
    const user = await User.findById(req.user.id).select('role');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Create reply
    const reply = new Comment({
      lesson: lesson._id,
      course: course._id,
      parentComment: commentId,
      author: req.user.id,
      authorRole: user.role,
      content: content.trim(),
      likes: [],
      likeCount: 0,
      status: 'active',
    });

    await reply.save();
    await reply.populate('author', 'fullName avatar role');

    // Create notification for parent comment author (async, don't wait)
    createReplyNotification(reply, parentComment, lesson, course).catch((err) => {
      console.error('Error creating reply notification:', err);
    });

    res.status(201).json({
      success: true,
      comment: {
        _id: reply._id,
        content: reply.content,
        author: {
          _id: reply.author._id,
          fullName: (reply.author as any).fullName,
          avatar: (reply.author as any).avatar,
          role: (reply.author as any).role,
        },
        likeCount: 0,
        isLiked: false,
        isEdited: false,
        createdAt: reply.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating reply:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating reply',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Edit a comment
 * @route   PUT /api/comments/:commentId
 * @access  Private (comment author only)
 */
export const editComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { commentId } = req.params;
    const { content } = req.body;

    // Validate content
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Content is required',
      });
    }

    if (content.length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Content cannot exceed 2000 characters',
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if user is author
    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments',
      });
    }

    // Check if comment is deleted
    if (comment.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Cannot edit deleted comment',
      });
    }

    // Update comment
    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();
    await comment.populate('author', 'fullName avatar role');

    res.json({
      success: true,
      comment: {
        _id: comment._id,
        content: comment.content,
        author: {
          _id: comment.author._id,
          fullName: (comment.author as any).fullName,
          avatar: (comment.author as any).avatar,
          role: (comment.author as any).role,
        },
        likeCount: comment.likeCount,
        isLiked: req.user ? comment.likes.some((likeId: any) => likeId.toString() === req.user!.id) : false,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt,
        createdAt: comment.createdAt,
      },
    });
  } catch (error) {
    console.error('Error editing comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error editing comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Delete a comment (soft delete)
 * @route   DELETE /api/comments/:commentId
 * @access  Private (comment author, instructor, or admin)
 */
export const deleteComment = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { commentId } = req.params;

    // Find comment
    const comment = await Comment.findById(commentId).populate({
      path: 'lesson',
      populate: { path: 'course' },
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check authorization
    const isAuthor = comment.author.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    const lesson = comment.lesson as any;
    const course = lesson.course as any;
    const isInstructor = req.user.role === 'instructor' && course.instructor.toString() === req.user.id;

    if (!isAuthor && !isAdmin && !isInstructor) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to delete this comment',
      });
    }

    // Soft delete
    comment.status = 'deleted';
    await comment.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Toggle like on a comment
 * @route   POST /api/comments/:commentId/like
 * @access  Private
 */
export const toggleLike = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { commentId } = req.params;

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    if (comment.status === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Cannot like deleted comment',
      });
    }

    // Toggle like
    const userId = req.user.id;
    const likeIndex = comment.likes.findIndex(
      (likeId) => likeId.toString() === userId
    );

    if (likeIndex === -1) {
      // Add like
      comment.likes.push(userId as any);
    } else {
      // Remove like
      comment.likes.splice(likeIndex, 1);
    }

    comment.likeCount = comment.likes.length;
    await comment.save();

    res.json({
      success: true,
      liked: likeIndex === -1,
      likeCount: comment.likeCount,
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling like',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
