import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  getExamAttemptById,
  getExamOverview,
  listMyAttemptsForExam,
  startExamAttempt,
  submitExamAttempt,
} from '../controllers/examAttemptController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

// Validation middleware
const examIdValidation = [
  param('examId')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  validate,
];

const attemptIdValidation = [
  param('examId')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  param('attemptId')
    .isMongoId()
    .withMessage('Invalid attempt ID'),
  validate,
];

const submitAttemptValidation = [
  param('examId')
    .isMongoId()
    .withMessage('Invalid exam ID'),
  param('attemptId')
    .isMongoId()
    .withMessage('Invalid attempt ID'),
  body('answers')
    .notEmpty()
    .withMessage('Answers are required')
    .isArray()
    .withMessage('Answers must be an array'),
  body('answers.*.question')
    .notEmpty()
    .withMessage('Question ID is required')
    .isMongoId()
    .withMessage('Invalid question ID'),
  body('answers.*.answerSingle')
    .optional()
    .isString()
    .withMessage('Single answer must be a string'),
  body('answers.*.answerMultiple')
    .optional()
    .isArray()
    .withMessage('Multiple answers must be an array'),
  body('answers.*.answerText')
    .optional()
    .isString()
    .trim()
    .withMessage('Text answer must be a string'),
  validate,
];

router.get('/:examId/overview', protect, examIdValidation, getExamOverview);
router.post('/:examId/start', protect, examIdValidation, startExamAttempt);
router.get('/:examId/attempts/:attemptId', protect, attemptIdValidation, getExamAttemptById);
router.post('/:examId/attempts/:attemptId/submit', protect, submitAttemptValidation, submitExamAttempt);
router.get('/:examId/attempts/my', protect, examIdValidation, listMyAttemptsForExam);

export default router;
