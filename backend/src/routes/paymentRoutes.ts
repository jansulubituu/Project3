import { Router } from 'express';
import { body } from 'express-validator';
import { createPayment, handleIpn } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { Payment } from '../models';
import mongoose from 'mongoose';

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

// Debug endpoint: Check payment and enrollment status
router.get('/debug/:paymentId', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }

    const payment = await Payment.findById(paymentId)
      .populate('user', 'email fullName')
      .populate('course', 'title slug');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Check enrollment
    const Enrollment = mongoose.model('Enrollment');
    const enrollment = await Enrollment.findOne({
      student: payment.user,
      course: payment.course,
    }).populate('course', 'title');

    res.json({
      success: true,
      payment: {
        id: payment._id,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        amount: payment.amount,
        paidAt: payment.paidAt,
        user: payment.user,
        course: payment.course,
        metadata: payment.metadata ? Object.fromEntries(payment.metadata) : null,
      },
      enrollment: enrollment
        ? {
            id: enrollment._id,
            status: enrollment.status,
            enrolledAt: enrollment.enrolledAt,
            progress: enrollment.progress,
          }
        : null,
    });
  } catch (error) {
    console.error('Debug payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment',
      error: (error as Error).message,
    });
  }
});

// Debug endpoint: Test IPN manually (for testing)
router.post('/debug/:paymentId/test-ipn', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    // Get order_invoice_number from metadata
    const metadata = payment.metadata ? Object.fromEntries(payment.metadata) : {};
    const orderInvoiceNumber = metadata.order_invoice_number || `PAY-${paymentId}`;

    // Simulate IPN callback
    const ipnBody = {
      order_invoice_number: orderInvoiceNumber,
      notification_type: 'ORDER_PAID',
      order_status: 'CAPTURED',
      transaction_status: 'APPROVED',
      order: {
        order_invoice_number: orderInvoiceNumber,
        order_status: 'CAPTURED',
      },
      transaction: {
        transaction_id: `TEST-TXN-${Date.now()}`,
        transaction_status: 'APPROVED',
      },
      custom_data: JSON.stringify({
        paymentId: paymentId,
        courseId: payment.course.toString(),
        userId: payment.user.toString(),
      }),
    };

    // Call handleIpn internally
    const mockReq = {
      body: ipnBody,
    } as any;
    
    const mockRes = {
      status: (code: number) => ({
        json: (data: any) => {
          console.info('[Test IPN] Response:', { code, data });
          return { code, data };
        },
      }),
    } as any;

    await handleIpn(mockReq, mockRes);

    // Check payment status after
    await payment.refresh();
    const updatedPayment = await Payment.findById(paymentId);

    res.json({
      success: true,
      message: 'IPN test completed',
      payment: {
        id: paymentId,
        status: updatedPayment?.status,
        orderInvoiceNumber,
      },
      ipnBody,
    });
  } catch (error) {
    console.error('Test IPN error:', error);
    res.status(500).json({
      success: false,
      message: 'Error testing IPN',
      error: (error as Error).message,
    });
  }
});

// Debug endpoint: Manually mark payment as completed (for testing)
router.post('/debug/:paymentId/mark-completed', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already completed',
        payment: {
          id: payment._id,
          status: payment.status,
        },
      });
    }

    // Mark as completed
    await payment.markCompleted(`MANUAL-${Date.now()}`);

    // Refresh payment
    const updatedPayment = await Payment.findById(paymentId);

    res.json({
      success: true,
      message: 'Payment marked as completed',
      payment: {
        id: paymentId,
        status: updatedPayment?.status,
        paidAt: updatedPayment?.paidAt,
      },
    });
  } catch (error) {
    console.error('Mark payment completed error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking payment as completed',
      error: (error as Error).message,
    });
  }
});

// Debug endpoint: Manually trigger enrollment creation (for testing)
router.post('/debug/:paymentId/create-enrollment', protect, async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return res.status(400).json({ success: false, message: 'Invalid payment ID' });
    }

    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Payment is not completed. Status: ' + payment.status,
        hint: 'Use /debug/:paymentId/mark-completed first',
      });
    }

    // Check if enrollment exists
    const Enrollment = mongoose.model('Enrollment');
    const existingEnrollment = await Enrollment.findOne({
      student: payment.user,
      course: payment.course,
    });

    if (existingEnrollment) {
      return res.json({
        success: true,
        message: 'Enrollment already exists',
        enrollment: existingEnrollment,
      });
    }

    // Create enrollment
    const enrollment = await Enrollment.create({
      student: payment.user,
      course: payment.course,
      payment: payment._id,
      enrolledAt: payment.paidAt || new Date(),
    });

    res.json({
      success: true,
      message: 'Enrollment created successfully',
      enrollment,
    });
  } catch (error) {
    console.error('Create enrollment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating enrollment',
      error: (error as Error).message,
    });
  }
});

export default router;










