import { Router } from 'express';
import { body, param, query } from 'express-validator';

import {
  createQuestion,
  deleteQuestion,
  getQuestionById,
  listQuestionsByCourse,
  updateQuestion,
} from '../controllers/questionController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const createQuestionValidation = [
  body('course')
    .notEmpty()
    .withMessage('Course is required')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('section')
    .optional()
    .isMongoId()
    .withMessage('Invalid section ID'),
  body('type')
    .notEmpty()
    .withMessage('Question type is required')
    .isIn(['single_choice', 'multiple_choice', 'short_answer'])
    .withMessage('Invalid question type'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  body('text')
    .notEmpty()
    .withMessage('Question text is required')
    .trim()
    .isLength({ min: 5 })
    .withMessage('Question text must be at least 5 characters'),
  body('options')
    .if(body('type').isIn(['single_choice', 'multiple_choice']))
    .notEmpty()
    .withMessage('Options are required for choice questions')
    .isArray({ min: 2 })
    .withMessage('At least 2 options are required'),
  body('options.*.id')
    .notEmpty()
    .withMessage('Option ID is required'),
  body('options.*.text')
    .notEmpty()
    .withMessage('Option text is required')
    .trim(),
  body('options.*.isCorrect')
    .isBoolean()
    .withMessage('isCorrect must be a boolean'),
  body('expectedAnswers')
    .if(body('type').equals('short_answer'))
    .notEmpty()
    .withMessage('Expected answers are required for short answer questions')
    .isArray({ min: 1 })
    .withMessage('At least one expected answer is required'),
  body('points')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Points must be a non-negative number'),
  body('negativeMarking')
    .optional()
    .isBoolean()
    .withMessage('negativeMarking must be a boolean'),
  body('negativePoints')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Negative points must be a non-negative number'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  validate,
];

const updateQuestionValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid question ID'),
  body('type')
    .optional()
    .isIn(['single_choice', 'multiple_choice', 'short_answer'])
    .withMessage('Invalid question type'),
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  body('text')
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage('Question text must be at least 5 characters'),
  body('options')
    .optional()
    .isArray({ min: 2 })
    .withMessage('At least 2 options are required'),
  body('expectedAnswers')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one expected answer is required'),
  body('points')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Points must be a non-negative number'),
  validate,
];

const questionIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid question ID'),
  validate,
];

const courseIdValidation = [
  param('courseId')
    .isMongoId()
    .withMessage('Invalid course ID'),
  query('type')
    .optional()
    .isIn(['single_choice', 'multiple_choice', 'short_answer'])
    .withMessage('Invalid question type filter'),
  query('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  validate,
];

router.post('/', protect, instructorOrAdmin, createQuestionValidation, createQuestion);
router.get('/course/:courseId', protect, instructorOrAdmin, courseIdValidation, listQuestionsByCourse);
router.get('/:id', protect, questionIdValidation, getQuestionById);
router.put('/:id', protect, instructorOrAdmin, updateQuestionValidation, updateQuestion);
router.delete('/:id', protect, instructorOrAdmin, questionIdValidation, deleteQuestion);

export default router;
