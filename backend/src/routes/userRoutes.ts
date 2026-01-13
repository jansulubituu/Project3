import { Router } from 'express';
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
  getMyProfile,
  uploadAvatar,
  getUserCourses,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/:id', getUserById);
router.get('/:id/courses', getUserCourses);

// Protected routes - Own profile
router.get('/me/profile', protect, getMyProfile);

// Protected routes - Own profile or Admin
router.put('/:id', protect, updateUser);
router.post('/:id/avatar', protect, uploadSingle, uploadAvatar);

// Admin only routes
router.post('/', protect, adminOnly, createUser);
router.get('/', protect, adminOnly, getAllUsers);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/deactivate', protect, adminOnly, deactivateUser);
router.put('/:id/activate', protect, adminOnly, activateUser);

// ✅ Updated: Allow own user or admin to view stats
router.get('/:id/stats', protect, getUserStats);

export default router;

