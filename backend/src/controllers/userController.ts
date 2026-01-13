import { Request, Response } from 'express';
import { User, Course, Enrollment, Review, Payment } from '../models';
import mongoose from 'mongoose';
import { uploadImageFromBuffer, deleteImage } from '../config/cloudinary';

// @desc    Create user (Admin only)
// @route   POST /api/users
// @access  Private/Admin
export const createUser = async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, role, isActive, bio, headline } = req.body;

    // Validate required fields
    if (!email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        error: 'Email, password, and fullName are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters',
      });
    }

    // Validate role
    const validRoles = ['student', 'instructor', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid role. Must be student, instructor, or admin',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered',
      });
    }

    // Create user (password will be hashed by pre-save hook)
    const user = await User.create({
      email,
      password,
      fullName,
      role: role || 'student',
      isActive: isActive !== undefined ? isActive : true,
      isEmailVerified: true, // Admin-created users are automatically verified
      bio,
      headline,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        isActive: user.isActive,
        isEmailVerified: user.isEmailVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error('Create user error:', error);
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ValidationError') {
      const validationError = error as mongoose.Error.ValidationError;
      const errors = Object.values(validationError.errors).map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        errors,
      });
    }
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      role,
      search,
      isActive,
    } = req.query;

    const query: Record<string, unknown> = {};

    // Filter by role
    if (role) {
      query.role = role;
    }

    // Filter by active status
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    // Search by name or email
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const users = await User.find(query)
      .select('-password -emailVerificationToken -resetPasswordToken -emailOTP')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(total / Number(limit)),
        totalItems: total,
        hasMore: skip + users.length < total,
      },
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Public
export const getUserById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    const user = await User.findById(id).select('-password -emailVerificationToken -resetPasswordToken -emailOTP');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get additional stats for instructors
    let stats = {};
    if (user.role === 'instructor') {
      const totalCourses = await Course.countDocuments({ instructor: id });
      const courses = await Course.find({ instructor: id });
      const totalStudents = courses.reduce((sum, course) => sum + course.enrollmentCount, 0);

      stats = {
        totalCourses,
        totalStudents,
      };
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        ...stats,
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/:id
// @access  Private (Own profile or Admin)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    // Check if user can update (own profile or admin)
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this user',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Fields that can be updated
    const allowedFields = [
      'fullName',
      'bio',
      'headline',
      'website',
      'social',
      'avatar',
    ];

    // Update only allowed fields
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        (user as unknown as Record<string, unknown>)[field] = req.body[field];
      }
    });

    // Admin can update additional fields
    if (req.user?.role === 'admin') {
      if (req.body.role) user.role = req.body.role;
      if (req.body.isActive !== undefined) user.isActive = req.body.isActive;
    }

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio,
        headline: user.headline,
        website: user.website,
        social: user.social,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot delete your own account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user is instructor with courses
    if (user.role === 'instructor') {
      const courseCount = await Course.countDocuments({ instructor: id });
      if (courseCount > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete instructor with ${courseCount} active courses. Please reassign or delete courses first.`,
        });
      }
    }

    // Delete related data
    await Promise.all([
      // Delete user's enrollments
      Enrollment.deleteMany({ student: id }),
      // Delete user's reviews
      Review.deleteMany({ student: id }),
      // Delete user's payments
      Payment.deleteMany({ user: id }),
      // Note: If instructor, courses should be handled separately
    ]);

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Deactivate user (Admin only)
// @route   PUT /api/users/:id/deactivate
// @access  Private/Admin
export const deactivateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    // Prevent admin from deactivating themselves
    if (req.user?.id === id) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.isActive = false;
    await user.save();

    res.json({
      success: true,
      message: 'User deactivated successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Deactivate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Activate user (Admin only)
// @route   PUT /api/users/:id/activate
// @access  Private/Admin
export const activateUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get user statistics (Own user or Admin)
// @route   GET /api/users/:id/stats
// @access  Private (Own user or Admin)
export const getUserStats = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    // ✅ Allow own user or admin to view stats
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
    }

    const isOwnProfile = req.user.id === id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to view this user\'s statistics',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const stats: Record<string, unknown> = {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };

    if (user.role === 'student') {
      // Student stats
      const enrollments = await Enrollment.countDocuments({ student: id });
      const completedCourses = await Enrollment.countDocuments({ 
        student: id, 
        status: 'completed' 
      });
      const totalPayments = await Payment.aggregate([
        { $match: { user: new mongoose.Types.ObjectId(id), status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);

      stats.enrollments = enrollments;
      stats.completedCourses = completedCourses;
      stats.totalSpent = totalPayments[0]?.total || 0;
    } else if (user.role === 'instructor') {
      // Instructor stats
      // Get instructor's courses
      const instructorCourses = await Course.find({ instructor: id }).select('_id');
      const courseIds = instructorCourses.map((c) => c._id);

      // ✅ FIX: Count unique students from Enrollment model (not sum enrollmentCount)
      const uniqueStudents = await Enrollment.distinct('student', {
        course: { $in: courseIds },
        status: { $in: ['active', 'completed'] },
      });

      // Count courses by status
      const totalCourses = instructorCourses.length;
      const publishedCourses = await Course.countDocuments({
        instructor: id,
        status: 'published',
      });
      const draftCourses = await Course.countDocuments({
        instructor: id,
        status: 'draft',
      });

      // Calculate total revenue from payments
      const totalRevenue = await Payment.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseInfo',
          },
        },
        { $unwind: '$courseInfo' },
        {
          $match: {
            'courseInfo.instructor': new mongoose.Types.ObjectId(id),
            status: 'completed',
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]);

      // ✅ Calculate weighted average rating
      const ratingStats = await Course.aggregate([
        {
          $match: {
            instructor: new mongoose.Types.ObjectId(id),
            status: 'published',
            averageRating: { $gt: 0 },
          },
        },
        {
          $group: {
            _id: null,
            weightedSum: { $sum: { $multiply: ['$averageRating', '$totalReviews'] } },
            totalReviews: { $sum: '$totalReviews' },
          },
        },
      ]);

      stats.totalCourses = totalCourses;
      stats.publishedCourses = publishedCourses;
      stats.draftCourses = draftCourses;
      stats.totalStudents = uniqueStudents.length; // ✅ Fixed: unique students count
      stats.totalRevenue = totalRevenue[0]?.total || 0;
      stats.averageRating =
        ratingStats[0]?.totalReviews > 0
          ? Math.round((ratingStats[0].weightedSum / ratingStats[0].totalReviews) * 10) / 10
          : 0;

      // Calculate monthly revenue and enrollments (last 6 months)
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);
      sixMonthsAgo.setDate(1);
      sixMonthsAgo.setHours(0, 0, 0, 0);

      // Generate array of last 6 months
      const months: string[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
      }

      // Monthly revenue aggregation
      const monthlyRevenueData = await Payment.aggregate([
        {
          $lookup: {
            from: 'courses',
            localField: 'course',
            foreignField: '_id',
            as: 'courseInfo',
          },
        },
        { $unwind: '$courseInfo' },
        {
          $match: {
            'courseInfo.instructor': new mongoose.Types.ObjectId(id),
            status: 'completed',
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            total: { $sum: '$finalAmount' },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      // Monthly enrollments aggregation
      const monthlyEnrollmentData = await Enrollment.aggregate([
        {
          $match: {
            course: { $in: courseIds },
            createdAt: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 },
        },
      ]);

      // Format monthly data
      const revenueMap = new Map<string, number>();
      monthlyRevenueData.forEach((item) => {
        const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        revenueMap.set(monthKey, item.total);
      });

      const enrollmentMap = new Map<string, number>();
      monthlyEnrollmentData.forEach((item) => {
        const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
        enrollmentMap.set(monthKey, item.count);
      });

      stats.monthlyRevenue = months.map((month) => ({
        month,
        value: revenueMap.get(month) || 0,
      }));

      stats.monthlyEnrollments = months.map((month) => ({
        month,
        value: enrollmentMap.get(month) || 0,
      }));
    }

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get own profile (detailed)
// @route   GET /api/users/me/profile
// @access  Private
export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const user = await User.findById(req.user!.id)
      .select('-password -emailVerificationToken -resetPasswordToken -emailOTP');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Get additional data based on role
    let additionalData: Record<string, unknown> = {};

    if (user.role === 'student') {
      const enrollments = await Enrollment.find({ student: user._id })
        .select('progress status enrolledAt completedLessons totalLessons course')
        .populate('course', 'title thumbnail price slug')
        .sort({ enrolledAt: -1 })
        .limit(10);

      const totalEnrollments = await Enrollment.countDocuments({ student: user._id });
      const completedCourses = await Enrollment.countDocuments({
        student: user._id,
        status: 'completed',
      });

      // Transform enrollments to include completedLessons count
      const transformedEnrollments = enrollments.map((enrollment: any) => {
        const enrollmentObj = enrollment.toObject();
        const completedLessonsArray = enrollmentObj.completedLessons || [];
        return {
          ...enrollmentObj,
          completedLessons: Array.isArray(completedLessonsArray) ? completedLessonsArray.length : 0,
        };
      });

      additionalData = {
        enrollments: transformedEnrollments.slice(0, 5), // Recent 5
        totalEnrollments,
        completedCourses,
      };
    } else if (user.role === 'instructor') {
      const courses = await Course.find({ instructor: user._id })
        .select('title thumbnail price status enrollmentCount averageRating')
        .sort({ createdAt: -1 })
        .limit(10);

      const totalCourses = await Course.countDocuments({ instructor: user._id });
      const publishedCourses = await Course.countDocuments({
        instructor: user._id,
        status: 'published',
      });
      const totalStudents = await Course.aggregate([
        { $match: { instructor: user._id } },
        { $group: { _id: null, total: { $sum: '$enrollmentCount' } } },
      ]);

      additionalData = {
        courses: courses.slice(0, 5), // Recent 5
        totalCourses,
        publishedCourses,
        totalStudents: totalStudents[0]?.total || 0,
      };
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        ...additionalData,
      },
    });
  } catch (error) {
    console.error('Get my profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Upload avatar
// @route   POST /api/users/:id/avatar
// @access  Private (Own profile or Admin)
export const uploadAvatar = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    // Check if user can update (own profile or admin)
    if (req.user?.id !== id && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this user',
      });
    }

    // Check if file is uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Upload to Cloudinary
    try {
      const uploadResult = await uploadImageFromBuffer(
        req.file.buffer,
        req.file.mimetype,
        'edulearn/avatars',
        `avatar-${user._id}`
      );

      // Delete old avatar from Cloudinary if exists and not default
      if (user.avatar && !user.avatar.includes('default-avatar')) {
        try {
          // Extract public_id from URL if possible
          const oldPublicId = user.avatar.split('/').pop()?.split('.')[0];
          if (oldPublicId) {
            await deleteImage(oldPublicId);
          }
        } catch (deleteError) {
          // Ignore delete errors (image might not exist in Cloudinary)
          console.warn('Failed to delete old avatar:', deleteError);
        }
      }

      // Update user avatar
      user.avatar = uploadResult.secure_url;
      await user.save();

      res.json({
        success: true,
        message: 'Avatar uploaded successfully',
        avatar: user.avatar,
      });
    } catch (uploadError) {
      console.error('Avatar upload error:', uploadError);
      res.status(500).json({
        success: false,
        error: 'Failed to upload avatar',
      });
    }
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

// @desc    Get user's courses (for instructor) or enrollments (for student)
// @route   GET /api/users/:id/courses
// @access  Public (or Private for own data)
export const getUserCourses = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }

    const user = await User.findById(id).select('role');
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const skip = (Number(page) - 1) * Number(limit);

    if (user.role === 'instructor') {
      // Get instructor's courses
      const query: any = { instructor: id };
      if (status) {
        query.status = status;
      }

      const courses = await Course.find(query)
        .select('title thumbnail price status enrollmentCount averageRating totalReviews createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Course.countDocuments(query);

      res.json({
        success: true,
        type: 'courses',
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
        courses,
      });
    } else if (user.role === 'student') {
      // Get student's enrollments
      const query: any = { student: id };
      if (status) {
        query.status = status;
      }

      const enrollments = await Enrollment.find(query)
        .populate('course', 'title thumbnail price instructor category')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Enrollment.countDocuments(query);

      res.json({
        success: true,
        type: 'enrollments',
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          itemsPerPage: Number(limit),
        },
        enrollments,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: 'User role does not have courses/enrollments',
      });
    }
  } catch (error) {
    console.error('Get user courses error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error',
    });
  }
};

