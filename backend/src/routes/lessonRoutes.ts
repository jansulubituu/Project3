import { Router } from 'express';
import {
  getLessonDetails,
  updateLesson,
  deleteLesson,
  uploadVideo,
} from '../controllers/lessonController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// Student / general access
router.get('/:id', protect, getLessonDetails);

// Validation middleware
const updateLessonValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('type')
    .optional()
    .isIn(['video', 'article', 'quiz', 'assignment', 'resource'])
    .withMessage('Invalid lesson type'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  body('isFree')
    .optional()
    .isBoolean()
    .withMessage('isFree must be a boolean'),
  validate,
];

const uploadVideoValidation = [
  body('videoUrl')
    .notEmpty()
    .withMessage('Video URL is required')
    .isURL()
    .withMessage('Video URL must be a valid URL'),
  body('videoDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Video duration must be a non-negative integer'),
  body('videoProvider')
    .optional()
    .isIn(['cloudinary', 'youtube', 'vimeo'])
    .withMessage('Invalid video provider'),
  validate,
];

// Protected routes - Instructor or Admin
// Note: Create lesson and reorder routes are mounted at /api/sections/:sectionId/lessons in sectionRoutes
router.put('/:id', protect, instructorOrAdmin, updateLessonValidation, updateLesson);
router.delete('/:id', protect, instructorOrAdmin, deleteLesson);
router.post('/:id/upload-video', protect, instructorOrAdmin, uploadVideoValidation, uploadVideo);

export default router;

