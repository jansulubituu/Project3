import { Router } from 'express';
import { param } from 'express-validator';
import {
  getCertificate,
  generateCertificateManually,
  verifyCertificate,
  getCertificateStatus,
} from '../controllers/certificateController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const enrollmentIdValidation = [
  param('enrollmentId').isMongoId().withMessage('Invalid enrollment ID'),
  validate,
];

// Get certificate (private)
router.get(
  '/enrollment/:enrollmentId',
  protect,
  enrollmentIdValidation,
  getCertificate
);

// Get certificate status (private)
router.get(
  '/enrollment/:enrollmentId/status',
  protect,
  enrollmentIdValidation,
  getCertificateStatus
);

// Generate certificate manually (private)
router.post(
  '/enrollment/:enrollmentId/generate',
  protect,
  enrollmentIdValidation,
  generateCertificateManually
);

// Verify certificate (public)
router.get('/verify/:certificateId', verifyCertificate);

export default router;
