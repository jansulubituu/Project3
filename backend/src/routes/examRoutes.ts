import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createExam,
  deleteExam,
  getExamById,
  getExamAnalytics,
  listExamsByCourse,
  updateExam,
} from '../controllers/examController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const createExamValidation = [
  body('course')
    .notEmpty()
    .withMessage('Course is required')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('section')
    .optional()
    .isMongoId()
    .withMessage('Invalid section ID'),
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
  body('questions.*.question')
    .optional()
    .isMongoId()
    .withMessage('Invalid question ID'),
  body('totalPoints')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Total points must be a non-negative number'),
  body('passingScore')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Passing score must be a non-negative number'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('maxAttempts')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max attempts must be at least 1'),
  body('scoringMethod')
    .optional()
    .isIn(['highest', 'latest', 'average'])
    .withMessage('Invalid scoring method'),
  body('showCorrectAnswers')
    .optional()
    .isIn(['never', 'after_submit', 'after_close'])
    .withMessage('Invalid show correct answers option'),
  body('openAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid openAt date format'),
  body('closeAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid closeAt date format'),
  body('latePenaltyPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Late penalty must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  validate,
];

const updateExamValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
  body('questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
  body('durationMinutes')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be at least 1 minute'),
  body('maxAttempts')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Max attempts must be at least 1'),
  body('scoringMethod')
    .optional()
    .isIn(['highest', 'latest', 'average'])
    .withMessage('Invalid scoring method'),
  body('showCorrectAnswers')
    .optional()
    .isIn(['never', 'after_submit', 'after_close'])
    .withMessage('Invalid show correct answers option'),
  body('openAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid openAt date format'),
  body('closeAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid closeAt date format'),
  body('latePenaltyPercent')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Late penalty must be between 0 and 100'),
  body('status')
    .optional()
    .isIn(['draft', 'published', 'archived'])
    .withMessage('Invalid status'),
  validate,
];

const examIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  validate,
];

const courseIdValidation = [
  param('courseId')
    .isMongoId()
    .withMessage('Invalid course ID'),
  validate,
];

router.post('/', protect, instructorOrAdmin, createExamValidation, createExam);
router.get('/course/:courseId', protect, courseIdValidation, listExamsByCourse);
router.get('/:id', protect, examIdValidation, getExamById);
router.get('/:id/analytics', protect, instructorOrAdmin, examIdValidation, getExamAnalytics);
router.put('/:id', protect, instructorOrAdmin, updateExamValidation, updateExam);
router.delete('/:id', protect, instructorOrAdmin, examIdValidation, deleteExam);

export default router;
