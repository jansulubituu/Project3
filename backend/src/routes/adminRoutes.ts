import { Router } from 'express';
import { getAdminDashboardStats, getAdminAnalyticsTrends, getAdminTopCourses } from '../controllers/adminController';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';

const router = Router();

// Admin dashboard stats
router.get('/dashboard/stats', protect, adminOnly, getAdminDashboardStats);

// Admin analytics
router.get('/analytics/trends', protect, adminOnly, getAdminAnalyticsTrends);
router.get('/analytics/top-courses', protect, adminOnly, getAdminTopCourses);

export default router;
