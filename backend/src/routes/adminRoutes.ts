import { Router } from 'express';
import { getAdminDashboardStats } from '../controllers/adminController';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';

const router = Router();

// Admin dashboard stats
router.get('/dashboard/stats', protect, adminOnly, getAdminDashboardStats);

export default router;
