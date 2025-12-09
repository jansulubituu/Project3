import { Router } from 'express';
import {
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  addInstructorResponse,
  getReviewById,
} from '../controllers/reviewController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const createReviewValidation = [
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .notEmpty()
    .withMessage('Comment is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  validate,
];

const updateReviewValidation = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters'),
  validate,
];

const markHelpfulValidation = [
  body('isHelpful')
    .notEmpty()
    .withMessage('isHelpful is required')
    .isBoolean()
    .withMessage('isHelpful must be a boolean'),
  validate,
];

const addResponseValidation = [
  body('response')
    .trim()
    .notEmpty()
    .withMessage('Response is required')
    .isLength({ min: 1, max: 500 })
    .withMessage('Response must be between 1 and 500 characters'),
  validate,
];

// Public routes
router.get('/:id', getReviewById);

// Protected routes - Student only (for creating/updating/deleting their own reviews)
router.put('/:id', protect, updateReviewValidation, updateReview);
router.delete('/:id', protect, deleteReview);

// Protected routes - Any authenticated user (for voting)
router.post('/:id/helpful', protect, markHelpfulValidation, markHelpful);

// Protected routes - Instructor or Admin (for responding to reviews)
router.post('/:id/response', protect, instructorOrAdmin, addResponseValidation, addInstructorResponse);

export default router;

