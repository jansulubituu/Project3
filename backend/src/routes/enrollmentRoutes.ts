import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  enrollInCourse,
  getMyEnrollments,
  getEnrollmentByCourse,
  getEnrollmentById,
  addStudentToCourse,
  addStudentsToCourse,
} from '../controllers/enrollmentController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const enrollmentValidation = [
  body('course')
    .notEmpty()
    .withMessage('Course is required')
    .isMongoId()
    .withMessage('Invalid course ID'),
  body('payment')
    .optional()
    .isMongoId()
    .withMessage('Invalid payment ID'),
  validate,
];

const myCoursesValidation = [
  query('status')
    .optional()
    .isIn(['active', 'completed', 'suspended', 'expired'])
    .withMessage('Invalid status filter'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be at least 1'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  validate,
];

const enrollmentIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid enrollment ID'),
  validate,
];

const courseParamValidation = [
  param('courseId')
    .notEmpty()
    .withMessage('Course identifier is required'),
  validate,
];

const addStudentValidation = [
  param('courseId')
    .notEmpty()
    .withMessage('Course identifier is required'),
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  validate,
];

const bulkAddValidation = [
  param('courseId')
    .notEmpty()
    .withMessage('Course identifier is required'),
  body('emails')
    .isArray({ min: 1, max: 50 })
    .withMessage('Emails must be an array with 1-50 items'),
  body('emails.*')
    .isEmail()
    .withMessage('Each email must be valid')
    .normalizeEmail(),
  validate,
];

router.post('/', protect, enrollmentValidation, enrollInCourse);
router.get('/my-courses', protect, myCoursesValidation, getMyEnrollments);
router.post('/course/:courseId/add-student', protect, addStudentValidation, addStudentToCourse);
router.post('/course/:courseId/bulk-add', protect, bulkAddValidation, addStudentsToCourse);
router.get('/course/:courseId', protect, courseParamValidation, getEnrollmentByCourse);
router.get('/:id', protect, enrollmentIdValidation, getEnrollmentById);

export default router;


