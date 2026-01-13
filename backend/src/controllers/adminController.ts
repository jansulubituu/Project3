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
