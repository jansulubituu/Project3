import { Router } from 'express';
import {
  getLandingPageConfig,
  getAllLandingPageConfigs,
  getLandingPageConfigById,
  createLandingPageConfig,
  updateLandingPageConfig,
  deleteLandingPageConfig,
  activateLandingPageConfig,
} from '../controllers/landingPageController';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';

const router = Router();

// Public route
router.get('/', getLandingPageConfig);

// Admin routes
router.get('/admin', protect, adminOnly, getAllLandingPageConfigs);
router.get('/admin/:id', protect, adminOnly, getLandingPageConfigById);
router.post('/admin', protect, adminOnly, createLandingPageConfig);
router.put('/admin/:id', protect, adminOnly, updateLandingPageConfig);
router.delete('/admin/:id', protect, adminOnly, deleteLandingPageConfig);
router.put('/admin/:id/activate', protect, adminOnly, activateLandingPageConfig);

export default router;

