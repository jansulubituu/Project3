import { Request, Response } from 'express';
import { SePayPgClient } from 'sepay-pg-node';
import mongoose from 'mongoose';
import crypto from 'crypto';
import { Course, Payment } from '../models';

type SePayEnv = 'sandbox' | 'production';

const ensureConfig = () => {
  const merchantId = process.env.SEPAY_MERCHANT_ID;
  const secretKey = process.env.SEPAY_SECRET_KEY;
  const env = (process.env.SEPAY_ENV as SePayEnv) || 'sandbox';

  if (!merchantId || !secretKey) {
    throw new Error('Missing SEPAY_MERCHANT_ID or SEPAY_SECRET_KEY');
  }

  return {
    merchantId,
    secretKey,
    env,
  };
};

const createClient = () => {
  const { merchantId, secretKey, env } = ensureConfig();
  return new SePayPgClient({
    env,
    merchant_id: merchantId,
    secret_key: secretKey,
  });
};

const toVndAmount = (value: number) => Math.max(0, Math.round(value));

const successUrl = process.env.SEPAY_SUCCESS_URL || 'http://localhost:3000/payment/success';
const errorUrl = process.env.SEPAY_ERROR_URL || 'http://localhost:3000/payment/error';
const cancelUrl = process.env.SEPAY_CANCEL_URL || 'http://localhost:3000/payment/cancel';

const sortObject = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.keys(obj)
    .sort()
    .reduce((acc, key) => {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        acc[key] = sortObject(value as Record<string, unknown>);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as Record<string, unknown>);

const computeSignature = (payload: Record<string, unknown>, secret: string) => {
  const canonical = JSON.stringify(sortObject(payload));
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
};

/**
 * @desc    Create SePay checkout session
 * @route   POST /api/payments/create
 * @access  Private (student)
 */
export const createPayment = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can create payments' });
    }

    const { courseId, payment_method = 'BANK_TRANSFER' } = req.body as {
      courseId?: string;
      payment_method?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';
    };

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required' });
    }

    const course = mongoose.Types.ObjectId.isValid(courseId)
      ? await Course.findById(courseId)
      : await Course.findOne({ slug: courseId });

    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    // Compute amount (use discountPrice if available)
    const amount = course.discountPrice ?? course.price;
    // SePay currently only supports VND; force currency to VND to avoid "invalid request"
    const currency = 'VND';

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Khóa học miễn phí hoặc số tiền không hợp lệ, không thể tạo thanh toán SePay',
      });
    }

    // Create pending payment record
    const payment = await Payment.create({
      user: req.user.id,
      course: course._id,
      amount,
      discountAmount: course.discountPrice ? course.price - course.discountPrice : 0,
      finalAmount: amount,
      currency,
      paymentMethod: 'sepay',
      status: 'pending',
      metadata: {
        courseSlug: course.slug,
      },
    });

    const orderInvoiceNumber = `PAY-${payment._id.toString()}`;

    const client = createClient();
    const fields = client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method,
      order_invoice_number: orderInvoiceNumber,
      order_amount: toVndAmount(amount),
      currency: currency || 'VND',
      order_description: course.title,
      success_url: successUrl,
      error_url: errorUrl,
      cancel_url: cancelUrl,
      custom_data: JSON.stringify({
        paymentId: payment._id.toString(),
        courseId: course._id.toString(),
        userId: req.user.id,
      }),
    });

    const checkoutUrl = client.checkout.initCheckoutUrl();

    // Keep invoice number for lookup
    const existingMetadata =
      payment.metadata instanceof Map ? Object.fromEntries(payment.metadata) : (payment.metadata || {});
    payment.metadata = new Map(
      Object.entries({
        ...existingMetadata,
        order_invoice_number: orderInvoiceNumber,
      })
    ) as unknown as Map<string, string>;
    await payment.save();

    return res.status(201).json({
      success: true,
      checkoutUrl,
      fields,
      paymentId: payment._id,
      orderInvoiceNumber,
    });
  } catch (error) {
    console.error('Failed to create SePay payment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create payment',
      error: (error as Error).message,
    });
  }
};

/**
 * @desc    Handle SePay IPN callback
 * @route   POST /api/payments/ipn
 * @access  Public (called by SePay)
 */
export const handleIpn = async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const notificationType = body.notification_type;
    const orderInvoiceNumber = body?.order?.order_invoice_number || body?.order_invoice_number;
    const transactionStatus = body?.transaction?.transaction_status || body?.transaction_status;
    const orderStatus = body?.order?.order_status || body?.order_status;
    const signature = body?.signature as string | undefined;

    if (!orderInvoiceNumber) {
      return res.status(400).json({ success: false, message: 'order_invoice_number is required' });
    }

    // Verify signature if provided
    const secretKey = process.env.SEPAY_SECRET_KEY;
    if (secretKey && signature) {
      const cloned = { ...body };
      delete (cloned as Record<string, unknown>).signature;
      const expected = computeSignature(cloned as Record<string, unknown>, secretKey);
      if (expected !== signature) {
        console.warn('SePay IPN signature mismatch', { orderInvoiceNumber });
        return res.status(200).json({ success: false, message: 'invalid signature' });
      }
    }

    // Basic status check: treat CAPTURED/APPROVED as success
    const isSuccess =
      notificationType === 'ORDER_PAID' ||
      orderStatus === 'CAPTURED' ||
      transactionStatus === 'APPROVED';

    let payment = await Payment.findOne({
      'metadata.order_invoice_number': orderInvoiceNumber,
    });

    // Fallback: try resolve by paymentId in custom_data if provided
    if (!payment && body?.custom_data) {
      try {
        const parsed = JSON.parse(body.custom_data);
        if (parsed.paymentId && mongoose.Types.ObjectId.isValid(parsed.paymentId)) {
          payment = await Payment.findById(parsed.paymentId);
        }
      } catch {
        // ignore parse errors
      }
    }

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }

    if (payment.status === 'completed') {
      console.info('[SePay IPN] Payment already completed', { paymentId: payment._id.toString() });
      return res.status(200).json({ success: true });
    }

    if (isSuccess) {
      console.info('[SePay IPN] Marking payment completed', {
        paymentId: payment._id.toString(),
        orderInvoiceNumber,
        notificationType,
        orderStatus,
        transactionStatus,
      });
      await payment.markCompleted(body?.transaction?.transaction_id || orderInvoiceNumber);
    } else {
      console.info('[SePay IPN] Marking payment failed', {
        paymentId: payment._id.toString(),
        orderInvoiceNumber,
        notificationType,
        orderStatus,
        transactionStatus,
      });
      await payment.markFailed();
    }

    // Always respond 200 so SePay does not retry unnecessarily
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Failed to process SePay IPN:', error);
    // Still return 200 to acknowledge; log for manual check
    return res.status(200).json({ success: false, message: (error as Error).message });
  }
};


