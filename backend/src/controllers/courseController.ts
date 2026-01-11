import { Request, Response } from 'express';
import { Course, Category, Section, Lesson, Review, Enrollment, User, Progress } from '../models';
import mongoose from 'mongoose';
import { uploadImageFromBuffer, deleteImage } from '../config/cloudinary';

// @desc    Get all published courses (Public catalog)
// @route   GET /api/courses
// @access  Public
export const getAllCourses = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      level,
      minPrice,
      maxPrice,
      minRating,
      search,
      sort = 'newest',
      instructor,
    } = req.query;

      // Only show courses that are published in public catalog.
    // Some legacy data may have status='published' but isPublished=false,
    // so we rely on status as the single source of truth here.
    const query: Record<string, unknown> = {
      status: 'published',
    };

    // Filter by category
    if (category) {
      const isObjectId = mongoose.Types.ObjectId.isValid(category as string);
      if (isObjectId) {
        query.category = category;
      } else {
        const categoryDoc = await Category.findOne({ slug: category });
        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          return res.json({
            success: true,
            courses: [],
            pagination: {
              currentPage: 1,
              totalPages: 0,
              totalItems: 0,
              itemsPerPage: Number(limit),
            },
          });
        }
      }
    }

    // Filter by level
    if (level) {
      query.level = level;
    }

    // Filter by price
    const priceConditions: any[] = [];
    if (minPrice) {
      priceConditions.push({
        $or: [
          { discountPrice: { $gte: Number(minPrice) } },
          { price: { $gte: Number(minPrice) } },
        ],
      });
    }
    if (maxPrice) {
      priceConditions.push({
        $or: [
          { discountPrice: { $lte: Number(maxPrice) } },
          { price: { $lte: Number(maxPrice) } },
        ],
      });
    }

    // Filter by rating
    if (minRating) {
      (query as any).averageRating = { $gte: Number(minRating) };
    }

    // Filter by instructor
    if (instructor) {
      (query as any).instructor = instructor;
    }

    // Search
    const searchConditions: any[] = [];
    if (search) {
      searchConditions.push({
        $or: [
          { title: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search as string, 'i')] } },
        ],
      });
    }

    // Combine all conditions with $and if needed
    const andConditions: any[] = [];
    if (priceConditions.length > 0) {
      andConditions.push(...priceConditions);
    }
    if (searchConditions.length > 0) {
      andConditions.push(...searchConditions);
    }
    if (andConditions.length > 0) {
      (query as any).$and = andConditions;
    }

    // Sort options
    let sortOption: any = { createdAt: -1 }; // default: newest
    switch (sort) {
      case 'newest':
        sortOption = { createdAt: -1 };
        break;
      case 'popular':
        sortOption = { enrollmentCount: -1 };
        break;
      case 'rating':
        sortOption = { averageRating: -1 };
        break;
      case 'price_asc':
        sortOption = { price: 1 };
        break;
      case 'price_desc':
        sortOption = { price: -1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const courses = await Course.find(query)
      .populate('instructor', 'fullName avatar headline')
      .populate('category', 'name slug')
      .select('-description -requirements -learningOutcomes -metaTitle -metaDescription -metaKeywords')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(query);

    // 🎯 CRITICAL: Always recalculate publishedLessonCount to ensure accuracy
    // Only count published lessons that still exist (not deleted)
    const Lesson = mongoose.model('Lesson');
    const transformedCourses = [];
    
    for (const course of courses) {
      // Recalculate published count (only published lessons, not draft or deleted)
      const publishedCount = await Lesson.countDocuments({
        course: course._id,
        isPublished: true,
      });
      
      // Update if different (to avoid unnecessary saves)
      if (course.publishedLessonCount !== publishedCount) {
        course.publishedLessonCount = publishedCount;
        // Save in background (don't await to avoid blocking response)
        course.save().catch((err) => {
          console.error(`[getAllCourses] Failed to update publishedLessonCount for course ${course._id}:`, err);
        });
      }
      
      // 🎯 Calculate enrollmentCount dynamically from actual enrollments
      const actualEnrollmentCount = await Enrollment.countDocuments({
        course: course._id,
        status: { $in: ['active', 'completed'] }, // Only count active and completed enrollments
      });
      
      // 🎯 For public catalog, totalLessons = publishedLessonCount (all users see published only)
      const courseObj = course.toObject();
      courseObj.totalLessons = courseObj.publishedLessonCount ?? 0; // ✅ Transform for public view
      courseObj.enrollmentCount = actualEnrollmentCount; // ✅ Use dynamically calculated count
      transformedCourses.push(courseObj);
    }

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses: transformedCourses,
    });
  } catch (error) {
    console.error('[getAllCourses] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching courses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get instructor's own courses
// @route   GET /api/courses/mine
// @access  Private/Instructor or Admin (admin thấy của chính mình nếu dùng endpoint này)
export const getMyCourses = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 12,
      status,
      search,
    } = req.query;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const query: Record<string, unknown> = {
      instructor: req.user.id,
    };

    if (status) {
      query.status = status;
    }

    if (search) {
      (query as any).$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const courses = await Course.find(query)
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(query);

    // 🎯 Calculate enrollmentCount dynamically for each course
    const coursesWithCount = await Promise.all(
      courses.map(async (course) => {
        const actualEnrollmentCount = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ['active', 'completed'] }, // Only count active and completed enrollments
        });
        const courseObj = course.toObject();
        courseObj.enrollmentCount = actualEnrollmentCount;
        return courseObj;
      })
    );

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses: coursesWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching instructor courses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get all courses for admin management
// @route   GET /api/courses/admin
// @access  Private/Admin
export const getAdminCourses = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      instructor,
      status,
      search,
    } = req.query;

    const query: Record<string, unknown> = {};

    if (instructor) {
      query.instructor = instructor;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      (query as any).$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const courses = await Course.find(query)
      .populate('instructor', 'fullName email role')
      .populate('category', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Course.countDocuments(query);

    // 🎯 Calculate enrollmentCount dynamically for each course
    const coursesWithCount = await Promise.all(
      courses.map(async (course) => {
        const actualEnrollmentCount = await Enrollment.countDocuments({
          course: course._id,
          status: { $in: ['active', 'completed'] }, // Only count active and completed enrollments
        });
        const courseObj = course.toObject();
        courseObj.enrollmentCount = actualEnrollmentCount;
        return courseObj;
      })
    );

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses: coursesWithCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin courses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get course by ID or slug
// @route   GET /api/courses/:id
// @access  Public
export const getCourseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if id is ObjectId or slug
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const query = isObjectId ? { _id: id } : { slug: id };

    const course = await Course.findOne(query)
      .populate('instructor', 'fullName avatar headline bio website social')
      .populate('category', 'name slug description')
      .populate('subcategory', 'name slug');

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user can view (published or owner/admin)
    if (course.status !== 'published' && (!req.user || (req.user.id !== course.instructor.toString() && req.user.role !== 'admin'))) {
      return res.status(403).json({
        success: false,
        message: 'Course is not published',
      });
    }

    // Check if user is enrolled (for additional info)
    let isEnrolled = false;
    if (req.user) {
      const enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: 'active',
      });
      isEnrolled = !!enrollment;
    }

    // 🎯 For public view, totalLessons = publishedLessonCount (all users see published only)
    // For instructors/admins, they can see all lessons via other endpoints
    const isInstructor = req.user && course.instructor.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';
    
    // 🎯 Calculate enrollmentCount dynamically from actual enrollments
    const actualEnrollmentCount = await Enrollment.countDocuments({
      course: course._id,
      status: { $in: ['active', 'completed'] }, // Only count active and completed enrollments
    });
    
    const courseObj = course.toObject();
    if (!isInstructor && !isAdmin) {
      // Public view: only show published lessons
      courseObj.totalLessons = courseObj.publishedLessonCount ?? 0;
    }
    // For instructors/admins, keep totalLessons as is (they can see all)
    
    // ✅ Use dynamically calculated enrollmentCount
    courseObj.enrollmentCount = actualEnrollmentCount;

    res.json({
      success: true,
      course: courseObj,
      isEnrolled,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get course curriculum
// @route   GET /api/courses/:id/curriculum
// @access  Public (but lessons may be restricted)
export const getCourseCurriculum = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check if user can view
    if (
      course.status !== 'published' &&
      (!req.user ||
        (req.user.id !== course.instructor.toString() && req.user.role !== 'admin'))
    ) {
      return res.status(403).json({
        success: false,
        message: 'Course is not published',
      });
    }

    // Check if user is enrolled (for progress / UI hints)
    let isEnrolled = false;
    let enrollment = null;
    if (req.user) {
      enrollment = await Enrollment.findOne({
        student: req.user.id,
        course: course._id,
        status: 'active',
      });
      isEnrolled = !!enrollment;
    }

    // Determine role for lesson visibility
    const isInstructor = req.user && course.instructor.toString() === req.user.id;
    const isAdmin = req.user && req.user.role === 'admin';

    // Get sections with lessons
    const sections = await Section.find({ course: course._id })
      .sort({ order: 1 })
      .populate({
        path: 'lessons',
        select: 'title description type order duration isFree isPublished',
        match: isInstructor || isAdmin ? {} : { isPublished: true },
        options: { sort: { order: 1 } },
      });

    // Get exams for each section
    const Exam = (await import('../models/Exam')).default;
    const examsBySection: Record<string, any[]> = {};
    
    const examQuery: any = { course: course._id };
    // Students can only see published exams
    if (!isInstructor && !isAdmin) {
      examQuery.status = 'published';
    }
    
    const exams = await Exam.find(examQuery)
      .populate({
        path: 'section',
        select: 'title order _id',
      })
      .select('title description section status totalPoints passingScore durationMinutes openAt closeAt maxAttempts')
      .sort({ createdAt: 1 });

    exams.forEach((exam: any) => {
      // Handle both populated and non-populated section
      let sectionId: string | null = null;
      if (exam.section) {
        if (typeof exam.section === 'object' && exam.section._id) {
          // Populated section
          sectionId = exam.section._id.toString();
        } else {
          // ObjectId
          sectionId = exam.section.toString();
        }
      }
      
      if (sectionId) {
        if (!examsBySection[sectionId]) {
          examsBySection[sectionId] = [];
        }
        // Convert to plain object and remove populated section, keep only section ID
        const examObj = exam.toObject ? exam.toObject() : exam;
        examsBySection[sectionId].push({
          _id: examObj._id,
          title: examObj.title,
          description: examObj.description,
          status: examObj.status,
          totalPoints: examObj.totalPoints,
          passingScore: examObj.passingScore,
          durationMinutes: examObj.durationMinutes,
          openAt: examObj.openAt,
          closeAt: examObj.closeAt,
          maxAttempts: examObj.maxAttempts,
        });
      }
    });

    // Get progress for all lessons if user is enrolled
    const lessonProgressMap: Record<string, { status: string; completedAt?: Date }> = {};
    const examProgressMap: Record<string, any> = {};
    if (isEnrolled && enrollment && req.user) {
      const progresses = await Progress.find({
        student: req.user.id,
        course: course._id,
      }).select('lesson exam type status completedAt examBestScore examLatestScore examPassed examAttempts');
      
      progresses.forEach((p: any) => {
        if (p.type === 'lesson' && p.lesson) {
          lessonProgressMap[p.lesson.toString()] = {
            status: p.status,
            completedAt: p.completedAt,
          };
        } else if (p.type === 'exam' && p.exam) {
          examProgressMap[p.exam.toString()] = {
            status: p.status,
            bestScore: p.examBestScore,
            latestScore: p.examLatestScore,
            passed: p.examPassed,
            attempts: p.examAttempts,
          };
        }
      });
    }

    // Get exam attempts for enrolled students to check remaining attempts
    const ExamAttempt = (await import('../models/ExamAttempt')).default;
    const examAttemptsMap: Record<string, { submitted: number; remaining: number | null }> = {};
    
    if (isEnrolled && req.user) {
      const examIds = exams.map((exam: any) => exam._id);
      if (examIds.length > 0) {
        const attempts = await ExamAttempt.find({
          exam: { $in: examIds },
          student: req.user.id,
          status: 'submitted',
        }).select('exam');
        
        examIds.forEach((examId: any) => {
          const exam = exams.find((e: any) => e._id.toString() === examId.toString());
          if (exam && exam.maxAttempts) {
            const submittedCount = attempts.filter((a: any) => 
              a.exam.toString() === examId.toString()
            ).length;
            examAttemptsMap[examId.toString()] = {
              submitted: submittedCount,
              remaining: Math.max(0, exam.maxAttempts - submittedCount),
            };
          } else {
            examAttemptsMap[examId.toString()] = {
              submitted: 0,
              remaining: null,
            };
          }
        });
      }
    }

    // Add progress status to each lesson and include exams with attempt info
    const sectionsWithProgress = sections.map((section: any) => ({
      ...section.toObject(),
      lessons: section.lessons.map((lesson: any) => {
        const progress = lessonProgressMap[lesson._id.toString()];
        return {
          ...lesson.toObject(),
          progress: progress ? {
            status: progress.status,
            completedAt: progress.completedAt,
          } : null,
        };
      }),
      exams: (examsBySection[section._id.toString()] || []).map((exam: any) => {
        const attemptInfo = examAttemptsMap[exam._id.toString()];
        const progress = examProgressMap[exam._id.toString()];
        return {
          ...exam,
          remainingAttempts: attemptInfo?.remaining ?? null,
          hasRemainingAttempts: attemptInfo ? attemptInfo.remaining === null || attemptInfo.remaining > 0 : true,
          progress: progress ? {
            status: progress.status,
            bestScore: progress.bestScore,
            latestScore: progress.latestScore,
            passed: progress.passed,
            attempts: progress.attempts,
          } : null,
        };
      }),
    }));

    // 🎯 For students, totalLessons = published lessons only
    // For instructors/admins, show all lessons (including draft)
    const totalLessonsForUser = isInstructor || isAdmin 
      ? course.totalLessons 
      : (course.publishedLessonCount ?? 0);

    res.json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        totalDuration: course.totalDuration,
        totalLessons: totalLessonsForUser, // ✅ Published only for students
      },
      isEnrolled,
      enrollment: enrollment ? {
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons.length,
        totalLessons: enrollment.totalLessons, // ✅ Already published only
      } : null,
      sections: sectionsWithProgress,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching curriculum',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get course reviews
// @route   GET /api/courses/:id/reviews
// @access  Public
export const getCourseReviews = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, sort = 'recent' } = req.query;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const query: any = {
      course: course._id,
      isPublished: true,
    };

    let sortOption: any = { createdAt: -1 };
    switch (sort) {
      case 'recent':
        sortOption = { createdAt: -1 };
        break;
      case 'helpful':
        sortOption = { helpfulCount: -1 };
        break;
      case 'rating_high':
        sortOption = { rating: -1 };
        break;
      case 'rating_low':
        sortOption = { rating: 1 };
        break;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const reviews = await Review.find(query)
      .populate('student', 'fullName avatar')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Review.countDocuments(query);

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      { $match: { course: course._id, isPublished: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]);

    res.json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        averageRating: course.averageRating,
        totalReviews: course.totalReviews,
      },
      ratingDistribution,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Create course (Instructor)
// @route   POST /api/courses
// @access  Private/Instructor
export const createCourse = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      shortDescription,
      category,
      subcategory,
      level,
      thumbnail,
      previewVideo,
      price,
      discountPrice,
      currency,
      language,
      requirements,
      learningOutcomes,
      targetAudience,
      tags,
      instructor: instructorFromBody,
    } = req.body;

    // Resolve instructor: admin có thể tạo course cho giảng viên khác
    let instructorId = req.user!.id;
    if (req.user!.role === 'admin' && instructorFromBody) {
      // Validate instructorFromBody
      if (!mongoose.Types.ObjectId.isValid(instructorFromBody)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid instructor ID',
        });
      }

      const instructorUser = await User.findById(instructorFromBody).select('role');
      if (!instructorUser || instructorUser.role !== 'instructor') {
        return res.status(400).json({
          success: false,
          message: 'Instructor not found or not an instructor',
        });
      }

      instructorId = instructorFromBody;
    }

    // Normalize optional fields
    const normalizedSubcategory = subcategory || undefined;

    // Validate category
    const categoryDoc = await Category.findById(category);
    if (!categoryDoc) {
      return res.status(400).json({
        success: false,
        message: 'Category not found',
      });
    }

    // Validate subcategory if provided
    if (normalizedSubcategory) {
      const subcategoryDoc = await Category.findById(normalizedSubcategory);
      if (!subcategoryDoc || subcategoryDoc.parent?.toString() !== category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid subcategory',
        });
      }
    }

    // Generate slug from title
    const slug = title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/-+/g, '-');

    // Check if slug exists
    const existingCourse = await Course.findOne({ slug });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course with this title already exists',
      });
    }

    const course = await Course.create({
      title,
      slug,
      description,
      shortDescription,
      instructor: instructorId,
      category,
      subcategory: normalizedSubcategory,
      level: level || 'all_levels',
      thumbnail,
      previewVideo,
      price,
      discountPrice,
      currency: currency || 'USD',
      language: language || 'English',
      requirements: requirements || [],
      learningOutcomes,
      targetAudience: targetAudience || [],
      tags: tags || [],
      status: 'draft',
      isPublished: false,
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Update course
// @route   PUT /api/courses/:id
// @access  Private/Instructor (own course) or Admin
export const updateCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this course',
      });
    }

    // Normalize optional fields to avoid casting errors
    if (updateData.subcategory === '') {
      updateData.subcategory = undefined;
    }

    // If title is being updated, regenerate slug
    if (updateData.title && updateData.title !== course.title) {
      const slug = updateData.title
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/-+/g, '-');

      const existingCourse = await Course.findOne({ slug, _id: { $ne: id } });
      if (existingCourse) {
        return res.status(400).json({
          success: false,
          message: 'Course with this title already exists',
        });
      }
      updateData.slug = slug;
    }

    // Validate category if being updated
    if (updateData.category) {
      const categoryDoc = await Category.findById(updateData.category);
      if (!categoryDoc) {
        return res.status(400).json({
          success: false,
          message: 'Category not found',
        });
      }
    }

    // Update course
    Object.assign(course, updateData);
    await course.save();

    res.json({
      success: true,
      message: 'Course updated successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete course
// @route   DELETE /api/courses/:id
// @access  Private/Instructor (own course) or Admin
export const deleteCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this course',
      });
    }

    // Check if course has enrollments
    const enrollmentsCount = await Enrollment.countDocuments({ course: id });
    if (enrollmentsCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course with ${enrollmentsCount} enrollment(s). Please archive instead.`,
      });
    }

    // Delete related data
    await Section.deleteMany({ course: id });
    await Lesson.deleteMany({ course: id });
    await Review.deleteMany({ course: id });

    await Course.deleteOne({ _id: id });

    res.json({
      success: true,
      message: 'Course deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Submit course for approval
// @route   POST /api/courses/:id/submit
// @access  Private/Instructor (own course)
export const submitCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization - only instructor can submit their own course
    if (course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this course',
      });
    }

    // Validate course can be submitted
    if (!course.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Course must have a thumbnail to be submitted',
      });
    }

    if (course.totalLessons === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course must have at least one lesson to be submitted',
      });
    }

    if (course.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Course is already published',
      });
    }

    // Clear rejection fields if resubmitting
    const wasRejected = course.status === 'rejected';
    if (wasRejected) {
      course.rejectionReason = undefined;
      course.rejectedAt = undefined;
    }
    
    // Update course status to pending
    course.status = 'pending';
    course.submittedAt = new Date();
    await course.save();

    res.json({
      success: true,
      message: 'Course submitted for approval successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error submitting course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Approve course (Admin)
// @route   PUT /api/courses/:id/approve
// @access  Private/Admin
export const approveCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Only pending courses can be approved
    if (course.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Course status is ${course.status}. Only pending courses can be approved.`,
      });
    }

    // Update course to published
    course.status = 'published';
    course.isPublished = true;
    course.publishedAt = new Date();
    course.approvedBy = req.user!.id as any;
    course.approvedAt = new Date();
    // Clear rejection fields
    course.rejectionReason = undefined;
    course.rejectedAt = undefined;
    await course.save();

    res.json({
      success: true,
      message: 'Course approved and published successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error approving course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Reject course (Admin)
// @route   PUT /api/courses/:id/reject
// @access  Private/Admin
export const rejectCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required',
      });
    }

    if (reason.trim().length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason cannot exceed 500 characters',
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Only pending courses can be rejected
    if (course.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Course status is ${course.status}. Only pending courses can be rejected.`,
      });
    }

    // Update course to rejected
    course.status = 'rejected';
    course.rejectionReason = reason.trim();
    course.rejectedAt = new Date();
    // Clear approval fields
    course.approvedBy = undefined;
    course.approvedAt = undefined;
    await course.save();

    res.json({
      success: true,
      message: 'Course rejected successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error rejecting course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Publish course (Legacy - for direct publish without approval)
// @route   POST /api/courses/:id/publish
// @access  Private/Instructor (own course) or Admin
export const publishCourse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    // Check authorization
    if (req.user!.role !== 'admin' && course.instructor.toString() !== req.user!.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to publish this course',
      });
    }

    // Validate course can be published
    if (!course.thumbnail) {
      return res.status(400).json({
        success: false,
        message: 'Course must have a thumbnail to be published',
      });
    }

    if (course.totalLessons === 0) {
      return res.status(400).json({
        success: false,
        message: 'Course must have at least one lesson to be published',
      });
    }

    // Update course
    course.status = 'published';
    course.isPublished = true;
    course.publishedAt = new Date();
    // If admin publishes, mark as approved
    if (req.user!.role === 'admin') {
      course.approvedBy = req.user!.id as any;
      course.approvedAt = new Date();
    }
    await course.save();

    res.json({
      success: true,
      message: 'Course published successfully',
      course,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing course',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Upload course thumbnail
// @route   POST /api/courses/:id/thumbnail
// @access  Private/Instructor (own course) or Admin
export const uploadCourseThumbnail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid course ID',
      });
    }

    const course = await Course.findById(id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (req.user.role !== 'admin' && course.instructor.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to upload thumbnail for this course',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    // Upload new thumbnail to Cloudinary
    const uploadResult = await uploadImageFromBuffer(
      req.file.buffer,
      req.file.mimetype,
      'edulearn/course-thumbnails',
      `course-thumb-${course._id}`
    );

    // Optionally try to delete old thumbnail if it's a Cloudinary URL
    if (course.thumbnail && course.thumbnail.includes('res.cloudinary.com')) {
      try {
        const parts = course.thumbnail.split('/');
        const last = parts[parts.length - 1];
        const publicId = last.split('.')[0];
        if (publicId) {
          await deleteImage(publicId);
        }
      } catch (deleteError) {
        console.warn('Failed to delete old course thumbnail:', deleteError);
      }
    }

    course.thumbnail = uploadResult.secure_url;
    await course.save();

    res.json({
      success: true,
      message: 'Thumbnail uploaded successfully',
      thumbnail: course.thumbnail,
    });
  } catch (error) {
    console.error('Upload course thumbnail error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading course thumbnail',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get platform statistics (Public)
// @route   GET /api/courses/stats
// @access  Public
export const getPlatformStats = async (_req: Request, res: Response) => {
  try {
    const [totalCourses, totalInstructors, totalStudents, avgRating] = await Promise.all([
      Course.countDocuments({ status: 'published' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'student' }),
      Course.aggregate([
        { $match: { status: 'published', averageRating: { $gt: 0 } } },
        { $group: { _id: null, avgRating: { $avg: '$averageRating' } } },
      ]),
    ]);

    const averageRating = avgRating.length > 0 && avgRating[0].avgRating
      ? Math.round(avgRating[0].avgRating * 10) / 10
      : 0;

    res.json({
      success: true,
      stats: {
        totalCourses,
        totalInstructors,
        totalStudents,
        averageRating,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching platform statistics',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Sync enrollmentCount for a specific course or all courses
// @route   POST /api/courses/:id/sync-enrollment-count or POST /api/courses/sync-enrollment-count
// @access  Private/Admin
export const syncEnrollmentCount = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // If id is provided, sync for a specific course
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid course ID',
        });
      }

      const course = await Course.findById(id);
      if (!course) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      // Count actual enrollments for this course
      const actualCount = await Enrollment.countDocuments({
        course: course._id,
        status: { $in: ['active', 'completed'] }, // Only count active and completed enrollments
      });

      // Update enrollmentCount
      course.enrollmentCount = actualCount;
      await course.save();

      return res.json({
        success: true,
        message: 'Enrollment count synced successfully',
        course: {
          _id: course._id,
          title: course.title,
          enrollmentCount: course.enrollmentCount,
          previousCount: course.enrollmentCount,
        },
      });
    }

    // If no id, sync for all courses
    const courses = await Course.find({});
    let syncedCount = 0;
    const results = [];

    for (const course of courses) {
      const actualCount = await Enrollment.countDocuments({
        course: course._id,
        status: { $in: ['active', 'completed'] },
      });

      const previousCount = course.enrollmentCount;
      if (actualCount !== previousCount) {
        course.enrollmentCount = actualCount;
        await course.save();
        syncedCount++;
        results.push({
          courseId: course._id.toString(),
          title: course.title,
          previousCount,
          newCount: actualCount,
        });
      }
    }

    return res.json({
      success: true,
      message: `Enrollment count sync completed. ${syncedCount} course(s) updated.`,
      totalCourses: courses.length,
      syncedCount,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error syncing enrollment count',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

