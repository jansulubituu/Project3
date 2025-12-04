import { Request, Response } from 'express';
import { Enrollment, Lesson, Progress, Section } from '../models';

// @desc    Create lesson
// @route   POST /api/sections/:sectionId/lessons
// @access  Private/Instructor (own course) or Admin
export const createLesson = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;
    const {
      title,
      description,
      type,
      videoUrl,
      videoDuration,
      videoProvider,
      articleContent,
      quizQuestions,
      attachments,
      order,
      isFree,
    } = req.body;

    const section = await Section.findById(sectionId).populate('course');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create lessons for this course',
      });
    }

    // Validate lesson type and content
    if (type === 'video' && !videoUrl) {
      return res.status(400).json({
        success: false,
        message: 'Video URL is required for video lessons',
      });
    }

    if (type === 'article' && !articleContent) {
      return res.status(400).json({
        success: false,
        message: 'Article content is required for article lessons',
      });
    }

    if (type === 'quiz' && (!quizQuestions || quizQuestions.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Quiz questions are required for quiz lessons',
      });
    }

    // If order not provided, get next order
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({ section: sectionId })
        .sort({ order: -1 })
        .limit(1);
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    // Check if order already exists
    const existingLesson = await Lesson.findOne({ section: sectionId, order: lessonOrder });
    if (existingLesson) {
      return res.status(400).json({
        success: false,
        message: 'Lesson with this order already exists',
      });
    }

    const lesson = await Lesson.create({
      section: sectionId,
      course: course._id,
      title,
      description,
      type,
      videoUrl,
      videoDuration,
      videoProvider,
      articleContent,
      quizQuestions,
      attachments,
      order: lessonOrder,
      duration: videoDuration || 0,
      isFree: isFree || false,
      isPublished: false,
    });

    // Update section statistics
    const sectionDoc = section as any;
    if (sectionDoc.updateStatistics) {
      await sectionDoc.updateStatistics();
    }

    res.status(201).json({
      success: true,
      message: 'Lesson created successfully',
      lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating lesson',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get lesson details (for students)
// @route   GET /api/lessons/:id
// @access  Private (student must be enrolled, except free lessons)
export const getLessonDetails = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id)
      .populate({
        path: 'section',
        select: 'title order',
      })
      .populate({
        path: 'course',
        select: 'title slug instructor status isPublished totalLessons',
      });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const course: any = lesson.course;

    // Check role
    const isInstructor = req.user && course?.instructor?.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';

    // Course must be published for students
    if (course && course.status !== 'published' && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Course is not published',
      });
    }

    // Lesson must be published for students (instructor/admin vẫn xem được)
    if (!lesson.isPublished && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Lesson is not published',
      });
    }

    // If lesson is not free, ensure user is enrolled or instructor/admin
    let isEnrolled = false;
    let lessonProgress = null;

    if (req.user) {
      if (!lesson.isFree && !isInstructor && !isAdmin) {
        const enrollment = await Enrollment.findOne({
          student: req.user.id,
          course: course?._id,
          status: 'active',
        });

        if (!enrollment) {
          return res.status(403).json({
            success: false,
            message: 'You must be enrolled in this course to view this lesson',
          });
        }

        isEnrolled = true;
      } else if (lesson.isFree) {
        // Free lessons can be viewed by any authenticated user
        isEnrolled = !!(await Enrollment.findOne({
          student: req.user.id,
          course: course?._id,
          status: 'active',
        }));
      }

      // Load progress for this lesson if exists
      lessonProgress = await Progress.findOne({
        student: req.user.id,
        lesson: lesson._id,
      }).select('status lastPosition timeSpent updatedAt');
    }

    res.json({
      success: true,
      lesson,
      isEnrolled,
      progress: lessonProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching lesson details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Update lesson
// @route   PUT /api/lessons/:id
// @access  Private/Instructor (own course) or Admin
export const updateLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const lesson = await Lesson.findById(id).populate({
      path: 'section',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const section = lesson.section as any;
    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this lesson',
      });
    }

    // If order is being changed, check for conflicts
    if (updateData.order !== undefined && updateData.order !== lesson.order) {
      const existingLesson = await Lesson.findOne({
        section: section._id,
        order: updateData.order,
        _id: { $ne: id },
      });
      if (existingLesson) {
        return res.status(400).json({
          success: false,
          message: 'Lesson with this order already exists',
        });
      }
    }

    // Update duration if video duration changed
    if (updateData.videoDuration !== undefined) {
      updateData.duration = updateData.videoDuration;
    }

    // Update lesson
    Object.assign(lesson, updateData);
    await lesson.save();

    // Update section statistics
    const sectionDoc = section as any;
    if (sectionDoc.updateStatistics) {
      await sectionDoc.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Lesson updated successfully',
      lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating lesson',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete lesson
// @route   DELETE /api/lessons/:id
// @access  Private/Instructor (own course) or Admin
export const deleteLesson = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const lesson = await Lesson.findById(id).populate({
      path: 'section',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const section = lesson.section as any;
    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this lesson',
      });
    }

    // Delete lesson
    await Lesson.deleteOne({ _id: id });

    // Update section statistics
    const sectionDoc = section as any;
    if (sectionDoc.updateStatistics) {
      await sectionDoc.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Lesson deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting lesson',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Reorder lessons
// @route   PUT /api/sections/:sectionId/lessons/reorder
// @access  Private/Instructor (own course) or Admin
export const reorderLessons = async (req: Request, res: Response) => {
  try {
    const { sectionId } = req.params;
    const { lessonIds } = req.body; // Array of lesson IDs in new order

    if (!Array.isArray(lessonIds) || lessonIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'lessonIds must be a non-empty array',
      });
    }

    const section = await Section.findById(sectionId).populate('course');

    if (!section) {
      return res.status(404).json({
        success: false,
        message: 'Section not found',
      });
    }

    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reorder lessons for this section',
      });
    }

    // Update order for each lesson
    const updatePromises = lessonIds.map((lessonId: string, index: number) => {
      return Lesson.findByIdAndUpdate(lessonId, { order: index + 1 }, { new: true });
    });

    await Promise.all(updatePromises);

    // Update section statistics
    const sectionDoc = section as any;
    if (sectionDoc.updateStatistics) {
      await sectionDoc.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Lessons reordered successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error reordering lessons',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Upload video (placeholder - actual upload handled by Cloudinary)
// @route   POST /api/lessons/:id/upload-video
// @access  Private/Instructor (own course) or Admin
export const uploadVideo = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { videoUrl, videoDuration, videoProvider } = req.body;

    const lesson = await Lesson.findById(id).populate({
      path: 'section',
      populate: { path: 'course' },
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const section = lesson.section as any;
    const course = section.course as any;

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload video for this lesson',
      });
    }

    // Update lesson with video info
    lesson.videoUrl = videoUrl;
    lesson.videoDuration = videoDuration;
    lesson.videoProvider = videoProvider || 'cloudinary';
    lesson.duration = videoDuration || 0;
    lesson.type = 'video';
    await lesson.save();

    // Update section statistics
    const sectionDoc = section as any;
    if (sectionDoc.updateStatistics) {
      await sectionDoc.updateStatistics();
    }

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      lesson,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error uploading video',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

