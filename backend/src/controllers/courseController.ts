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
    if (minPrice) {
      (query as any).$or = [
        { discountPrice: { $gte: Number(minPrice) } },
        { price: { $gte: Number(minPrice) } },
      ];
    }
    if (maxPrice) {
      if (query.$or) {
        (query as any).$and = [
          { $or: [{ discountPrice: { $lte: Number(maxPrice) } }, { price: { $lte: Number(maxPrice) } }] },
        ];
      } else {
        (query as any).$or = [
          { discountPrice: { $lte: Number(maxPrice) } },
          { price: { $lte: Number(maxPrice) } },
        ];
      }
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
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { shortDescription: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search as string, 'i')] } },
      ];
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

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses,
    });
  } catch (error) {
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

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses,
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

    res.json({
      success: true,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        itemsPerPage: Number(limit),
      },
      courses,
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

    res.json({
      success: true,
      course,
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

    // Get progress for all lessons if user is enrolled
    let lessonProgressMap: Record<string, { status: string; completedAt?: Date }> = {};
    if (isEnrolled && enrollment && req.user) {
      const progresses = await Progress.find({
        student: req.user.id,
        course: course._id,
      }).select('lesson status completedAt');
      
      progresses.forEach((p: any) => {
        lessonProgressMap[p.lesson.toString()] = {
          status: p.status,
          completedAt: p.completedAt,
        };
      });
    }

    // Add progress status to each lesson
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
    }));

    res.json({
      success: true,
      course: {
        _id: course._id,
        title: course.title,
        totalDuration: course.totalDuration,
        totalLessons: course.totalLessons,
      },
      isEnrolled,
      enrollment: enrollment ? {
        progress: enrollment.progress,
        completedLessons: enrollment.completedLessons.length,
        totalLessons: enrollment.totalLessons,
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

// @desc    Publish course
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

