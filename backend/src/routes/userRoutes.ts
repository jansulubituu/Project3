import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  deactivateUser,
  activateUser,
  getUserStats,
} from '../controllers/userController';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';

const router = Router();

// Public routes
router.get('/:id', getUserById);

// Protected routes - Own profile or Admin
router.put('/:id', protect, updateUser);

// Admin only routes
router.get('/', protect, adminOnly, getAllUsers);
router.delete('/:id', protect, adminOnly, deleteUser);
router.put('/:id/deactivate', protect, adminOnly, deactivateUser);
router.put('/:id/activate', protect, adminOnly, activateUser);
router.get('/:id/stats', protect, adminOnly, getUserStats);

export default router;

