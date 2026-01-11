import { Router } from 'express';
import {
  getAllCourses,
  getCourseById,
  getCourseCurriculum,
  getCourseReviews,
  createCourse,
  updateCourse,
  deleteCourse,
  publishCourse,
  submitCourse,
  approveCourse,
  rejectCourse,
  getMyCourses,
  getAdminCourses,
  uploadCourseThumbnail,
  getPlatformStats,
  syncEnrollmentCount,
} from '../controllers/courseController';
import { createReview } from '../controllers/reviewController';
import { protect, optionalAuth } from '../middleware/auth';
import { instructorOrAdmin, adminOnly } from '../middleware/authorize';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// Validation middleware
const createCourseValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Course title is required')
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('shortDescription')
    .trim()
    .notEmpty()
    .withMessage('Short description is required')
    .isLength({ max: 200 })
    .withMessage('Short description cannot exceed 200 characters'),
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'all_levels'])
    .withMessage('Invalid level'),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  body('learningOutcomes')
    .isArray({ min: 4 })
    .withMessage('Must have at least 4 learning outcomes'),
  body('learningOutcomes.*')
    .trim()
    .notEmpty()
    .withMessage('Learning outcome cannot be empty'),
  validate,
];

const updateCourseValidation = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 10, max: 200 })
    .withMessage('Title must be between 10 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 50 })
    .withMessage('Description must be at least 50 characters'),
  body('shortDescription')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Short description cannot exceed 200 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Invalid category ID'),
  body('level')
    .optional()
    .isIn(['beginner', 'intermediate', 'advanced', 'all_levels'])
    .withMessage('Invalid level'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a non-negative number'),
  body('discountPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount price must be a non-negative number'),
  validate,
];

const rejectCourseValidation = [
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection reason must be between 10 and 500 characters'),
  validate,
];

// Public routes (with optional auth to allow instructor/admin to see drafts)
router.get('/', optionalAuth, getAllCourses);
router.get('/stats', getPlatformStats);
router.get('/:id', optionalAuth, getCourseById);
router.get('/:id/curriculum', optionalAuth, getCourseCurriculum);
router.get('/:id/reviews', getCourseReviews);

// Review routes nested under courses
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
router.post('/:courseId/reviews', protect, createReviewValidation, createReview);

// Management routes
router.get('/mine/list', protect, instructorOrAdmin, getMyCourses);
router.get('/admin/list', protect, adminOnly, getAdminCourses);
router.post('/:id/thumbnail', protect, instructorOrAdmin, uploadSingle, uploadCourseThumbnail);

// Protected routes - Instructor or Admin
router.post('/', protect, instructorOrAdmin, createCourseValidation, createCourse);
router.put('/:id', protect, instructorOrAdmin, updateCourseValidation, updateCourse);
router.delete('/:id', protect, instructorOrAdmin, deleteCourse);
router.post('/:id/publish', protect, instructorOrAdmin, publishCourse);

// Approval workflow routes
router.post('/:id/submit', protect, instructorOrAdmin, submitCourse);
router.put('/:id/approve', protect, adminOnly, approveCourse);
router.put('/:id/reject', protect, adminOnly, rejectCourseValidation, rejectCourse);

// Sync enrollment count routes
router.post('/sync-enrollment-count', protect, adminOnly, syncEnrollmentCount);
router.post('/:id/sync-enrollment-count', protect, adminOnly, syncEnrollmentCount);

// Section routes nested under courses
import { createSection, reorderSections } from '../controllers/sectionController';
const createSectionValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Section title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer'),
  validate,
];
const reorderSectionsValidation = [
  body('sectionIds')
    .isArray({ min: 1 })
    .withMessage('sectionIds must be a non-empty array'),
  body('sectionIds.*')
    .isMongoId()
    .withMessage('Each section ID must be a valid MongoDB ID'),
  validate,
];
router.post('/:courseId/sections', protect, instructorOrAdmin, createSectionValidation, createSection);
router.put('/:courseId/sections/reorder', protect, instructorOrAdmin, reorderSectionsValidation, reorderSections);

export default router;

