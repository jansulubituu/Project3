import { Router } from 'express';
import { body } from 'express-validator';
import { createPayment, handleIpn } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';

const router = Router();

const createPaymentValidation = [
  body('courseId').notEmpty().withMessage('courseId is required'),
  body('payment_method')
    .optional()
    .isIn(['BANK_TRANSFER', 'NAPAS_BANK_TRANSFER'])
    .withMessage('payment_method must be BANK_TRANSFER or NAPAS_BANK_TRANSFER'),
  validate,
];

router.post('/create', protect, createPaymentValidation, createPayment);
router.post('/ipn', handleIpn);

export default router;

