import { Request, Response } from 'express';
import { User, Course, Enrollment, Review, Payment } from '../models';
import mongoose from 'mongoose';

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

    const query: any = {};

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
        (user as any)[field] = req.body[field];
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

// @desc    Get user statistics (Admin only)
// @route   GET /api/users/:id/stats
// @access  Private/Admin
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

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    const stats: any = {
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
      const courses = await Course.countDocuments({ instructor: id });
      const totalStudents = await Course.aggregate([
        { $match: { instructor: new mongoose.Types.ObjectId(id) } },
        { $group: { _id: null, total: { $sum: '$enrollmentCount' } } },
      ]);
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

      stats.totalCourses = courses;
      stats.totalStudents = totalStudents[0]?.total || 0;
      stats.totalRevenue = totalRevenue[0]?.total || 0;
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

