import { Router } from 'express';
import {
  updateSection,
  deleteSection,
} from '../controllers/sectionController';
import { protect } from '../middleware/auth';
import { instructorOrAdmin } from '../middleware/authorize';
import { body } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const updateSectionValidation = [
  body('title')
    .optional()
    .trim()
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

// Protected routes - Instructor or Admin
// Note: Create section route is mounted at /api/courses/:courseId/sections in courseRoutes
router.put('/:id', protect, instructorOrAdmin, updateSectionValidation, updateSection);
router.delete('/:id', protect, instructorOrAdmin, deleteSection);

// Lesson routes nested under sections
import { createLesson, reorderLessons } from '../controllers/lessonController';
// Exam routes nested under sections
import { reorderExams } from '../controllers/examController';
const createLessonValidation = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Lesson title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
  body('type')
    .notEmpty()
    .withMessage('Lesson type is required')
    .isIn(['video', 'article', 'quiz', 'assignment', 'resource'])
    .withMessage('Invalid lesson type'),
  body('videoUrl')
    .if(body('type').equals('video'))
    .notEmpty()
    .withMessage('Video URL is required for video lessons'),
  body('articleContent')
    .if(body('type').equals('article'))
    .notEmpty()
    .withMessage('Article content is required for article lessons'),
  body('quizQuestions')
    .if(body('type').equals('quiz'))
    .isArray({ min: 1 })
    .withMessage('Quiz questions are required for quiz lessons'),
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
const reorderLessonsValidation = [
  body('lessonIds')
    .isArray({ min: 1 })
    .withMessage('lessonIds must be a non-empty array'),
  body('lessonIds.*')
    .isMongoId()
    .withMessage('Each lesson ID must be a valid MongoDB ID'),
  validate,
];
router.post('/:sectionId/lessons', protect, instructorOrAdmin, createLessonValidation, createLesson);
router.put('/:sectionId/lessons/reorder', protect, instructorOrAdmin, reorderLessonsValidation, reorderLessons);

// Exam reorder route
const reorderExamsValidation = [
  body('examIds')
    .isArray({ min: 1 })
    .withMessage('examIds must be a non-empty array'),
  body('examIds.*')
    .isMongoId()
    .withMessage('Each exam ID must be a valid MongoDB ID'),
  validate,
];
router.put('/:sectionId/exams/reorder', protect, instructorOrAdmin, reorderExamsValidation, reorderExams);

export default router;

