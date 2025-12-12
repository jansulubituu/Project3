import { Router } from 'express';
import { body, param, query } from 'express-validator';
import {
  enrollInCourse,
  getMyEnrollments,
  getEnrollmentByCourse,
  getEnrollmentById,
  addStudentToCourse,
  addStudentsToCourse,
  removeStudentFromCourse,
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

const deleteEnrollmentValidation = [
  param('enrollmentId')
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
    .optional()
    .isEmail()
    .withMessage('Email must be valid')
    .normalizeEmail(),
  body('studentId')
    .optional()
    .isMongoId()
    .withMessage('Invalid studentId'),
  body()
    .custom((value) => {
      if (!value.email && !value.studentId) {
        throw new Error('Either email or studentId is required');
      }
      return true;
    }),
  validate,
];

const bulkAddValidation = [
  param('courseId')
    .notEmpty()
    .withMessage('Course identifier is required'),
  body('emails')
    .optional()
    .isArray({ min: 1, max: 50 })
    .withMessage('Emails must be an array with 1-50 items'),
  body('emails.*')
    .optional()
    .isEmail()
    .withMessage('Each email must be valid')
    .normalizeEmail(),
  body('studentIds')
    .optional()
    .isArray({ min: 1, max: 50 })
    .withMessage('StudentIds must be an array with 1-50 items'),
  body('studentIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each studentId must be valid'),
  body()
    .custom((value) => {
      const hasEmails = value.emails && Array.isArray(value.emails) && value.emails.length > 0;
      const hasStudentIds = value.studentIds && Array.isArray(value.studentIds) && value.studentIds.length > 0;
      if (!hasEmails && !hasStudentIds) {
        throw new Error('Either emails array or studentIds array is required');
      }
      return true;
    }),
  validate,
];

router.post('/', protect, enrollmentValidation, enrollInCourse);
router.get('/my-courses', protect, myCoursesValidation, getMyEnrollments);
router.post('/course/:courseId/add-student', protect, addStudentValidation, addStudentToCourse);
router.post('/course/:courseId/bulk-add', protect, bulkAddValidation, addStudentsToCourse);
router.delete('/:enrollmentId', protect, deleteEnrollmentValidation, removeStudentFromCourse);
router.get('/course/:courseId', protect, courseParamValidation, getEnrollmentByCourse);
router.get('/:id', protect, enrollmentIdValidation, getEnrollmentById);

export default router;


