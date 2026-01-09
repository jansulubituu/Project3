import { Router } from 'express';
import { body } from 'express-validator';
import {
  updateLessonProgress,
  completeLesson,
  getExamProgress,
  getCourseProgress,
  markExamComplete,
  checkUnlockStatus,
} from '../controllers/progressController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const updateProgressValidation = [
  body('status')
    .optional()
    .isIn(['not_started', 'in_progress', 'completed'])
    .withMessage('Invalid status'),
  body('lastPosition')
    .optional()
    .isInt({ min: 0 })
    .withMessage('lastPosition must be a non-negative integer'),
  body('timeSpent')
    .optional()
    .isInt({ min: 0 })
    .withMessage('timeSpent must be a non-negative integer'),
  body('answers')
    .optional()
    .isArray({ min: 1 })
    .withMessage('answers must be a non-empty array'),
  body('answers.*.questionId')
    .optional()
    .isString()
    .withMessage('questionId must be a string'),
  body('answers.*.answer')
    .optional()
    .isString()
    .withMessage('answer must be a string'),
  validate,
];

router.put('/lesson/:lessonId', protect, updateProgressValidation, updateLessonProgress);
router.post('/lesson/:lessonId/complete', protect, completeLesson);

// Exam progress endpoints
router.get('/exam/:examId', protect, getExamProgress);
router.get('/course/:courseId', protect, getCourseProgress);
router.post('/exam/:examId/complete', protect, markExamComplete);

// Unlock check endpoint
router.get('/unlock-check', protect, checkUnlockStatus);

export default router;


