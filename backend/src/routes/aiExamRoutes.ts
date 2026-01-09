import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  createGenerationJob,
  getGenerationJobStatus,
  listAvailableModels,
  listPromptTemplates,
  publishGeneratedExam,
} from '../controllers/aiExamController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const createJobValidation = [
  body('course')
    .notEmpty()
    .withMessage('Course is required')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('section')
    .optional()
    .isMongoId()
    .withMessage('Invalid section ID'),
  body('inputType')
    .notEmpty()
    .withMessage('Input type is required')
    .isIn(['uploaded_file', 'course_material', 'prompt_only'])
    .withMessage('Invalid input type'),
  body('sources')
    .optional()
    .isArray()
    .withMessage('Sources must be an array'),
  body('sources.*.type')
    .optional()
    .isIn(['lesson', 'file', 'url', 'text'])
    .withMessage('Invalid source type'),
  body('sources.*.lessonId')
    .optional()
    .isMongoId()
    .withMessage('Invalid lesson ID'),
  body('sources.*.url')
    .optional()
    .isURL()
    .withMessage('Invalid URL'),
  body('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .trim()
    .isLength({ min: 10 })
    .withMessage('Prompt must be at least 10 characters'),
  body('targetTemplate')
    .optional()
    .isMongoId()
    .withMessage('Invalid template ID'),
  body('targetExam')
    .optional()
    .isMongoId()
    .withMessage('Invalid exam ID'),
  validate,
];

const jobIdValidation = [
  param('jobId')
    .isMongoId()
    .withMessage('Invalid job ID'),
  validate,
];

const examIdValidation = [
  param('examId')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  validate,
];

router.post('/exams/generate', protect, instructorOrAdmin, createJobValidation, createGenerationJob);
router.get('/jobs/:jobId', protect, instructorOrAdmin, jobIdValidation, getGenerationJobStatus);
router.post('/exams/:examId/publish', protect, instructorOrAdmin, examIdValidation, publishGeneratedExam);
router.get('/models', protect, instructorOrAdmin, listAvailableModels);
router.get('/prompt-templates', protect, instructorOrAdmin, listPromptTemplates);

export default router;
