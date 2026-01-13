import { Request, Response } from 'express';
import { User, Course, Enrollment, Payment } from '../models';

// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard/stats
// @access  Private/Admin
export const getAdminDashboardStats = async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalStudents,
      totalInstructors,
      totalAdmins,
      totalCourses,
      publishedCourses,
      pendingCourses,
      draftCourses,
      totalEnrollments,
      activeEnrollments,
      completedEnrollments,
      totalRevenue,
      monthlyRevenue,
      avgRating,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'instructor' }),
      User.countDocuments({ role: 'admin' }),
      Course.countDocuments(),
      Course.countDocuments({ status: 'published' }),
      Course.countDocuments({ status: 'pending' }),
      Course.countDocuments({ status: 'draft' }),
      Enrollment.countDocuments(),
      Enrollment.countDocuments({ status: 'active' }),
      Enrollment.countDocuments({ status: 'completed' }),
      Payment.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Payment.aggregate([
        {
          $match: {
            status: 'completed',
            createdAt: { $gte: new Date(new Date().setDate(1)) },
          },
        },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } },
      ]),
      Course.aggregate([
        { $match: { status: 'published', averageRating: { $gt: 0 } } },
        {
          $group: {
            _id: null,
            weightedSum: { $sum: { $multiply: ['$averageRating', '$totalReviews'] } },
            totalReviews: { $sum: '$totalReviews' },
          },
        },
      ]),
    ]);

    const averageRating = avgRating[0]?.totalReviews > 0
      ? Math.round((avgRating[0].weightedSum / avgRating[0].totalReviews) * 10) / 10
      : 0;

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          students: totalStudents,
          instructors: totalInstructors,
          admins: totalAdmins,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          pending: pendingCourses,
          draft: draftCourses,
        },
        enrollments: {
          total: totalEnrollments,
          active: activeEnrollments,
          completed: completedEnrollments,
        },
        revenue: {
          total: totalRevenue[0]?.total || 0,
          monthly: monthlyRevenue[0]?.total || 0,
        },
        ratings: {
          average: averageRating,
          totalReviews: avgRating[0]?.totalReviews || 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching admin dashboard stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get admin analytics trends (revenue, enrollments, users)
// @route   GET /api/admin/analytics/trends
// @access  Private/Admin
export const getAdminAnalyticsTrends = async (_req: Request, res: Response) => {
  try {
    // Calculate date range: last 6 months
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    sixMonthsAgo.setDate(1); // Start of month
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Generate array of last 6 months
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    // Revenue aggregation by month
    const revenueData = await Payment.aggregate([
      {
        $match: {
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

    // Enrollments aggregation by month
    const enrollmentData = await Enrollment.aggregate([
      {
        $match: {
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

    // Users aggregation by month
    const userData = await User.aggregate([
      {
        $match: {
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

    // Format data: create map for quick lookup
    const revenueMap = new Map<string, number>();
    revenueData.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      revenueMap.set(monthKey, item.total);
    });

    const enrollmentMap = new Map<string, number>();
    enrollmentData.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      enrollmentMap.set(monthKey, item.count);
    });

    const userMap = new Map<string, number>();
    userData.forEach((item) => {
      const monthKey = `${item._id.year}-${String(item._id.month).padStart(2, '0')}`;
      userMap.set(monthKey, item.count);
    });

    // Build response arrays
    const revenue = months.map((month) => ({
      month,
      value: revenueMap.get(month) || 0,
    }));

    const enrollments = months.map((month) => ({
      month,
      value: enrollmentMap.get(month) || 0,
    }));

    const users = months.map((month) => ({
      month,
      value: userMap.get(month) || 0,
    }));

    res.json({
      success: true,
      data: {
        revenue,
        enrollments,
        users,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics trends',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get top courses for admin
// @route   GET /api/admin/analytics/top-courses
// @access  Private/Admin
export const getAdminTopCourses = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const sortBy = (req.query.sortBy as string) || 'enrollment';

    let sortField: string;
    let sortOrder: number;

    switch (sortBy) {
      case 'revenue':
        sortField = 'revenue';
        sortOrder = -1;
        break;
      case 'rating':
        sortField = 'averageRating';
        sortOrder = -1;
        break;
      case 'enrollment':
      default:
        sortField = 'enrollmentCount';
        sortOrder = -1;
        break;
    }

    // Get courses with enrollment count, revenue, and rating
    const courses = await Course.aggregate([
      {
        $match: {
          status: 'published',
        },
      },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'course',
          as: 'enrollments',
        },
      },
      {
        $lookup: {
          from: 'payments',
          localField: '_id',
          foreignField: 'course',
          as: 'payments',
        },
      },
      {
        $addFields: {
          enrollmentCount: { $size: '$enrollments' },
          revenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$payments',
                    as: 'payment',
                    cond: { $eq: ['$$payment.status', 'completed'] },
                  },
                },
                as: 'payment',
                in: '$$payment.finalAmount',
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          thumbnail: 1,
          enrollmentCount: 1,
          revenue: 1,
          averageRating: 1,
          totalReviews: 1,
        },
      },
      {
        $sort: sortField === 'revenue' 
          ? { revenue: sortOrder as 1 | -1 }
          : sortField === 'averageRating'
          ? { averageRating: sortOrder as 1 | -1 }
          : { enrollmentCount: sortOrder as 1 | -1 },
      },
      {
        $limit: limit,
      },
    ]);

    res.json({
      success: true,
      courses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching top courses',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
