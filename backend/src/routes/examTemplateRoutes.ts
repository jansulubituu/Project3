import express from 'express';
import { body } from 'express-validator';
import {
  getTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../controllers/examTemplateController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';

const router = express.Router();

// Validation middleware
const createTemplateValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('numberOfQuestions')
    .isInt({ min: 1 })
    .withMessage('Number of questions must be at least 1'),
  body('difficultyDistribution')
    .optional()
    .isArray()
    .withMessage('Difficulty distribution must be an array'),
  body('difficultyDistribution.*.level')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
  body('difficultyDistribution.*.ratio')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Ratio must be between 0 and 100'),
  body('typeDistribution')
    .optional()
    .isArray()
    .withMessage('Type distribution must be an array'),
  body('typeDistribution.*.type')
    .optional()
    .isIn(['single_choice', 'multiple_choice', 'short_answer'])
    .withMessage('Invalid question type'),
  body('typeDistribution.*.ratio')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Ratio must be between 0 and 100'),
  body('topicDistribution')
    .optional()
    .isArray()
    .withMessage('Topic distribution must be an array'),
  body('topicDistribution.*.tag')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Tag is required'),
  body('topicDistribution.*.ratio')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Ratio must be between 0 and 100'),
  body('shuffleQuestions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle questions must be a boolean'),
  body('shuffleAnswers')
    .optional()
    .isBoolean()
    .withMessage('Shuffle answers must be a boolean'),
];

const updateTemplateValidation = [
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  body('numberOfQuestions')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Number of questions must be at least 1'),
  body('difficultyDistribution')
    .optional()
    .isArray()
    .withMessage('Difficulty distribution must be an array'),
  body('typeDistribution')
    .optional()
    .isArray()
    .withMessage('Type distribution must be an array'),
  body('topicDistribution')
    .optional()
    .isArray()
    .withMessage('Topic distribution must be an array'),
  body('shuffleQuestions')
    .optional()
    .isBoolean()
    .withMessage('Shuffle questions must be a boolean'),
  body('shuffleAnswers')
    .optional()
    .isBoolean()
    .withMessage('Shuffle answers must be a boolean'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
];

// Routes
// Note: These routes are mounted at /api/courses, so paths are relative to that
router.get('/:courseId/exam-templates', protect, instructorOrAdmin, getTemplates);
router.get('/exam-templates/:id', protect, instructorOrAdmin, getTemplate);
router.post('/:courseId/exam-templates', protect, instructorOrAdmin, createTemplateValidation, createTemplate);
router.put('/exam-templates/:id', protect, instructorOrAdmin, updateTemplateValidation, updateTemplate);
router.delete('/exam-templates/:id', protect, instructorOrAdmin, deleteTemplate);

export default router;
