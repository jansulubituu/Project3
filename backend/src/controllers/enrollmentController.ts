import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course, Enrollment } from '../models';

const ENROLLMENT_STATUSES = ['active', 'completed', 'suspended', 'expired'];

const hasObjectId = (value: unknown): value is { _id: mongoose.Types.ObjectId } => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const possibleId = (value as { _id?: unknown })._id;
  return possibleId instanceof mongoose.Types.ObjectId;
};

const extractDocumentId = (value: unknown): string | undefined => {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (value instanceof mongoose.Types.ObjectId) {
    return value.toString();
  }

  if (hasObjectId(value)) {
    return value._id.toString();
  }

  return undefined;
};

const extractInstructorId = (course: unknown): string | undefined => {
  if (!course || typeof course !== 'object') {
    return undefined;
  }

  const instructor = (course as { instructor?: unknown }).instructor;
  return extractDocumentId(instructor);
};

/**
 * Helper to resolve a course either by Mongo ObjectId or slug
 */
const findCourseByIdentifier = async (identifier: string) => {
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    return Course.findById(identifier);
  }

  return Course.findOne({ slug: identifier });
};

/**
 * @desc    Enroll current user in a course
 * @route   POST /api/enrollments
 * @access  Private
 */
export const enrollInCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { course: courseId, payment } = req.body;

    const course = await Course.findById(courseId).select('instructor status isPublished totalLessons title');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (course.instructor.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Instructors cannot enroll in their own course',
      });
    }

    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: 'Course is not available for enrollment',
      });
    }

    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course._id,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this course',
      });
    }

    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: course._id,
      payment: payment || undefined,
      totalLessons: course.totalLessons,
      enrolledAt: new Date(),
      status: 'active',
    });

    res.status(201).json({
      success: true,
      message: 'Enrollment successful',
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to create enrollment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get enrollments for the logged in user
 * @route   GET /api/enrollments/my-courses
 * @access  Private
 */
export const getMyEnrollments = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { status, page = '1', limit = '12' } = req.query;
    const parsedPage = Math.max(parseInt(page as string, 10) || 1, 1);
    const parsedLimit = Math.min(Math.max(parseInt(limit as string, 10) || 12, 1), 50);
    const skip = (parsedPage - 1) * parsedLimit;

    const query: Record<string, unknown> = {
      student: req.user.id,
    };

    if (status && typeof status === 'string' && ENROLLMENT_STATUSES.includes(status)) {
      query.status = status;
    }

    const [enrollments, total] = await Promise.all([
      Enrollment.find(query)
        .populate({
          path: 'course',
          select: 'title slug thumbnail level totalLessons enrollmentCount averageRating instructor',
          populate: {
            path: 'instructor',
            select: 'fullName avatar headline',
          },
        })
        .populate('payment', 'amount currency status provider reference transactionId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Enrollment.countDocuments(query),
    ]);

    res.json({
      success: true,
      enrollments,
      pagination: {
        currentPage: parsedPage,
        totalPages: Math.ceil(total / parsedLimit),
        totalItems: total,
        itemsPerPage: parsedLimit,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch enrollments',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get enrollment by ID
 * @route   GET /api/enrollments/:id
 * @access  Private (owner, instructor, admin)
 */
export const getEnrollmentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const enrollment = await Enrollment.findById(id)
      .populate({
        path: 'course',
        select: 'title slug thumbnail level totalLessons totalDuration instructor status',
        populate: {
          path: 'instructor',
          select: 'fullName avatar headline email',
        },
      })
      .populate('student', 'fullName email avatar role')
      .populate('payment', 'amount currency status provider reference transactionId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const studentId = extractDocumentId(enrollment.student as unknown);
    const courseInstructorId = extractInstructorId(enrollment.course as unknown);

    const isOwner = studentId === req.user.id;
    const isInstructor = courseInstructorId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this enrollment',
      });
    }

    res.json({
      success: true,
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch enrollment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Get enrollment(s) by course
 * @route   GET /api/enrollments/course/:courseId
 * @access  Private
 *          - Student: returns their enrollment
 *          - Instructor/Admin: returns all enrollments for the course
 */
export const getEnrollmentByCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { courseId } = req.params;
    const course = await findCourseByIdentifier(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (isInstructor || isAdmin) {
      const enrollments = await Enrollment.find({ course: course._id })
        .populate('student', 'fullName email avatar role')
        .populate('payment', 'amount currency status provider reference transactionId')
        .sort({ createdAt: -1 });

      return res.json({
        success: true,
        course: {
          id: course._id,
          title: course.title,
          slug: course.slug,
        },
        enrollments,
      });
    }

    const enrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course._id,
    })
      .populate({
        path: 'course',
        select: 'title slug thumbnail level totalLessons totalDuration instructor',
        populate: {
          path: 'instructor',
          select: 'fullName avatar headline',
        },
      })
      .populate('payment', 'amount currency status provider reference transactionId');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found for this course',
      });
    }

    res.json({
      success: true,
      enrollment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch enrollments for course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


