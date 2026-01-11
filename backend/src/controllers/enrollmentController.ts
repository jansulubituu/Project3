import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Course, Enrollment, User } from '../models';
import { createNotification } from '../services/notificationService';

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

    // Only students can enroll themselves
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can enroll in courses',
      });
    }

    const { course: courseId, payment } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: 'Course ID is required',
      });
    }

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

    // Check if course is available for enrollment
    // Course must be published (status === 'published' AND isPublished === true)
    if (course.status !== 'published') {
      return res.status(400).json({
        success: false,
        message: `Course is not available for enrollment. Current status: ${course.status}. Only published courses can be enrolled.`,
        courseStatus: course.status,
      });
    }

    // if (!course.isPublished) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Course is not published yet. Please wait for the instructor to publish this course.',
    //     courseStatus: course.status,
    //     isPublished: course.isPublished,
    //   });
    // }

    const existingEnrollment = await Enrollment.findOne({
      student: req.user.id,
      course: course._id,
    });

    if (existingEnrollment) {
      return res.status(409).json({
        success: false,
        message: 'You are already enrolled in this course',
        enrollment: existingEnrollment,
      });
    }

    // 🎯 For students, totalLessons = published lessons only
    // Students should only see published lessons, not draft
    const Lesson = mongoose.model('Lesson');
    const publishedLessonCount = await Lesson.countDocuments({
      course: course._id,
      isPublished: true,
    });

    const enrollment = await Enrollment.create({
      student: req.user.id,
      course: course._id,
      payment: payment || undefined,
      totalLessons: publishedLessonCount, // ✅ Only published lessons for students
      enrolledAt: new Date(),
      status: 'active',
    });

    // Populate enrollment data for response
    await enrollment.populate({
      path: 'course',
      select: 'title slug thumbnail',
    });

    // Create notification for student (async, don't wait)
    const populatedCourse = enrollment.course as any;
    if (populatedCourse) {
      createNotification({
        userId: new mongoose.Types.ObjectId(req.user.id) as mongoose.Types.ObjectId,
        type: 'enrollment',
        title: 'Đăng ký thành công',
        message: `Bạn đã đăng ký thành công khóa học '${populatedCourse.title}'`,
        link: `/courses/${populatedCourse.slug}`,
        data: {
          courseId: populatedCourse._id.toString(),
          courseSlug: populatedCourse.slug,
          enrollmentId: enrollment._id.toString(),
        },
      }).catch((err) => {
        console.error('Error creating enrollment notification:', err);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Enrollment successful',
      enrollment,
    });
  } catch (error) {
    console.error('Error enrolling in course:', error);
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
        .select('progress status enrolledAt completedLessons completedExams requiredExams totalLessons totalTimeSpent lastAccessed completedAt hasReviewed certificateIssued certificateUrl certificateId certificateIssuedAt completionSnapshot')
        .populate({
          path: 'course',
          select: 'title slug thumbnail level totalLessons publishedLessonCount enrollmentCount averageRating instructor',
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

    // Transform enrollments to ensure completedLessons and completedExams are properly returned
    const Exam = (await import('../models/Exam')).default;
    const transformedEnrollments = await Promise.all(
      enrollments.map(async (enrollment: any) => {
        const enrollmentObj = enrollment.toObject();
        // Ensure completedLessons is an array and return its length
        const completedLessonsArray = enrollmentObj.completedLessons || [];
        const completedExamsArray = enrollmentObj.completedExams || [];
        const requiredExamsArray = enrollmentObj.requiredExams || [];
        
        // 🎯 For students, course.totalLessons should be publishedLessonCount
        // enrollment.totalLessons is already published only (fixed earlier)
        if (enrollmentObj.course && enrollmentObj.course.publishedLessonCount !== undefined) {
          enrollmentObj.course.totalLessons = enrollmentObj.course.publishedLessonCount;
        }
        
        // Calculate required exams count
        // Use requiredExams array length if available, otherwise count published exams
        let requiredExamsCount = Array.isArray(requiredExamsArray) ? requiredExamsArray.length : 0;
        if (requiredExamsCount === 0 && enrollmentObj.course) {
          // Count published exams in course as fallback
          try {
            const publishedExamsCount = await Exam.countDocuments({
              course: enrollmentObj.course._id,
              status: 'published',
            });
            requiredExamsCount = publishedExamsCount;
          } catch (err) {
            console.error('Error counting exams:', err);
            requiredExamsCount = 0;
          }
        }
        
        return {
          ...enrollmentObj,
          completedLessons: Array.isArray(completedLessonsArray) ? completedLessonsArray.length : 0,
          completedLessonsIds: completedLessonsArray,
          completedExams: Array.isArray(completedExamsArray) ? completedExamsArray.length : 0,
          completedExamsIds: completedExamsArray,
          requiredExams: requiredExamsCount,
          requiredExamsIds: requiredExamsArray,
        };
      })
    );

    res.json({
      success: true,
      enrollments: transformedEnrollments,
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
        select: 'title slug thumbnail level totalLessons publishedLessonCount totalDuration instructor status',
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

    // 🎯 For students (owners), course.totalLessons should be publishedLessonCount
    const enrollmentObj = enrollment.toObject();
    if (isOwner && enrollmentObj.course && typeof enrollmentObj.course === 'object' && 'publishedLessonCount' in enrollmentObj.course) {
      (enrollmentObj.course as any).totalLessons = (enrollmentObj.course as any).publishedLessonCount;
    }

    res.json({
      success: true,
      enrollment: enrollmentObj,
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
        select: 'title slug thumbnail level totalLessons publishedLessonCount totalDuration instructor',
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

    // 🎯 For students, course.totalLessons should be publishedLessonCount
    const enrollmentObj = enrollment.toObject();
    if (enrollmentObj.course && typeof enrollmentObj.course === 'object' && 'publishedLessonCount' in enrollmentObj.course) {
      (enrollmentObj.course as any).totalLessons = (enrollmentObj.course as any).publishedLessonCount;
    }

    res.json({
      success: true,
      enrollment: enrollmentObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to fetch enrollments for course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Add one student to a course by email
 * @route   POST /api/enrollments/course/:courseId/add-student
 * @access  Private (Instructor of the course or Admin)
 */
export const addStudentToCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { courseId } = req.params;
    const { email, studentId } = req.body as { email?: string; studentId?: string };

    // Either email or studentId must be provided
    if (!email && !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Either email or studentId is required',
      });
    }

    const course = await findCourseByIdentifier(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add students to this course',
      });
    }

    // Find user by email or studentId
    let user;
    if (studentId) {
      // Admin can use studentId directly
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can use studentId to add students',
        });
      }
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid studentId',
        });
      }
      user = await User.findById(studentId).select('_id email fullName role');
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id email fullName role');
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `User with email ${email} not found`,
      });
    }

    // Only students can be enrolled
    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: `User ${email} is not a student. Only students can be enrolled in courses.`,
      });
    }

    // Check if already enrolled
    const existing = await Enrollment.findOne({
      student: user._id,
      course: course._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Student ${email} is already enrolled in this course`,
        enrollment: existing,
      });
    }

    // 🎯 For students, totalLessons = published lessons only
    const Lesson = mongoose.model('Lesson');
    const publishedLessonCount = await Lesson.countDocuments({
      course: course._id,
      isPublished: true,
    });

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: user._id,
      course: course._id,
      totalLessons: publishedLessonCount, // ✅ Only published lessons for students
      enrolledAt: new Date(),
      status: 'active',
    });

    // Populate enrollment data
    await enrollment.populate('student', 'fullName email avatar');
    await enrollment.populate('course', 'title slug');

    res.status(201).json({
      success: true,
      message: `Student ${email} has been successfully enrolled in the course`,
      enrollment,
    });
  } catch (error) {
    console.error('Error adding student to course:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add student to course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Remove a student from a course (delete enrollment)
 * @route   DELETE /api/enrollments/:enrollmentId
 * @access  Private (Instructor of the course or Admin)
 */
export const removeStudentFromCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { enrollmentId } = req.params;

    if (!enrollmentId || !mongoose.Types.ObjectId.isValid(enrollmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid enrollment ID',
      });
    }

    // Find enrollment with course and student info
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate('course', 'instructor title')
      .populate('student', 'email fullName');

    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found',
      });
    }

    const course = enrollment.course as any;
    const student = enrollment.student as any;

    // Check authorization
    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove students from this course',
      });
    }

    // Delete enrollment and related progress records
    // Note: pre/post('deleteOne') hooks will automatically decrement enrollmentCount
    const Progress = mongoose.model('Progress');
    await Promise.all([
      Enrollment.findByIdAndDelete(enrollmentId),
      Progress.deleteMany({ enrollment: enrollmentId }),
    ]);

    // The post('deleteOne') hook handles enrollmentCount decrement automatically

    res.json({
      success: true,
      message: `Student ${student.email} has been removed from the course`,
      deletedEnrollment: {
        id: enrollment._id,
        studentEmail: student.email,
        studentName: student.fullName,
        courseTitle: course.title,
      },
    });
  } catch (error) {
    console.error('Error removing student from course:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to remove student from course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * @desc    Add one or many students to a course by email
 * @route   POST /api/enrollments/course/:courseId/bulk-add
 * @access  Private (Instructor of the course or Admin)
 */
export const addStudentsToCourse = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { courseId } = req.params;
    const { emails, studentIds } = req.body as { emails?: string[]; studentIds?: string[] };

    // Either emails or studentIds must be provided
    if ((!emails || emails.length === 0) && (!studentIds || studentIds.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Either emails array or studentIds array is required',
      });
    }

    const course = await findCourseByIdentifier(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const isInstructor = course.instructor.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isInstructor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add students to this course',
      });
    }

    // Admin can use studentIds, others use emails
    let users: any[] = [];
    let normalizedEmails: string[] = [];
    
    if (studentIds && studentIds.length > 0) {
      // Admin can use studentIds directly
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Only admin can use studentIds to add students',
        });
      }
      // Validate all studentIds are valid ObjectIds
      const validIds = studentIds.filter((id) => mongoose.Types.ObjectId.isValid(id));
      if (validIds.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: 'Invalid studentId(s) found',
        });
      }
      users = await User.find({ _id: { $in: validIds } }).select('_id email fullName role');
    } else if (emails && emails.length > 0) {
      // Normalize emails (trim and lowercase)
      normalizedEmails = emails.map((e) => e.toLowerCase().trim());
      users = await User.find({ email: { $in: normalizedEmails } }).select('_id email fullName role');
    }
    const foundEmails = new Set(users.map((u) => u.email.toLowerCase()));
    const missingEmails = normalizedEmails.length > 0 
      ? normalizedEmails.filter((e) => !foundEmails.has(e))
      : [];
    
    // If using studentIds, check for missing IDs
    const missingStudentIds: string[] = [];
    if (studentIds && studentIds.length > 0) {
      const foundIds = new Set(users.map((u) => u._id.toString()));
      missingStudentIds.push(...studentIds.filter((id) => !foundIds.has(id)));
    }

    const created: any[] = [];
    const skipped: any[] = [];

    for (const user of users) {
      try {
        // Only students can be enrolled
        if (user.role !== 'student') {
          skipped.push({
            email: user.email,
            fullName: user.fullName,
            reason: 'not_student',
            message: `User ${user.email} is not a student`,
          });
          continue;
        }

        const existing = await Enrollment.findOne({
          student: user._id,
          course: course._id,
        });

        if (existing) {
          skipped.push({
            email: user.email,
            fullName: user.fullName,
            reason: 'already_enrolled',
            status: existing.status,
            enrollmentId: existing._id,
          });
          continue;
        }

        const enrollment = await Enrollment.create({
          student: user._id,
          course: course._id,
          totalLessons: course.totalLessons,
          enrolledAt: new Date(),
          status: 'active',
        });

        created.push({
          email: user.email,
          fullName: user.fullName,
          enrollmentId: enrollment._id,
        });
      } catch (err) {
        console.error(`Failed to add student ${user.email} to course:`, err);
        skipped.push({
          email: user.email,
          fullName: user.fullName,
          reason: 'error',
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      course: {
        id: course._id,
        title: course.title,
        slug: course.slug,
      },
      summary: {
        totalRequested: studentIds && studentIds.length > 0 ? studentIds.length : normalizedEmails.length,
        createdCount: created.length,
        skippedCount: skipped.length,
        missingCount: missingEmails.length + missingStudentIds.length,
      },
      missingEmails: missingEmails.length > 0 ? missingEmails : undefined,
      missingStudentIds: missingStudentIds.length > 0 ? missingStudentIds : undefined,
      created,
      skipped,
    });
  } catch (error) {
    console.error('Error adding students to course:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to add students to course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};


