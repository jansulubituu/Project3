import mongoose, { Document, Schema } from 'mongoose';

export interface IPayment extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: 'stripe' | 'vnpay' | 'momo' | 'free' | 'sepay';
  paymentIntent?: string;
  stripeCustomerId?: string;
  vnpayTransactionId?: string;
  vnpayOrderInfo?: string;
  sepayTransactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paidAt?: Date;
  refundedAt?: Date;
  metadata?: Map<string, string>;
  invoiceUrl?: string;
  couponCode?: string;
  createdAt: Date;
  updatedAt: Date;
  markCompleted: (transactionId?: string) => Promise<void>;
  markFailed: () => Promise<void>;
  refund: () => Promise<void>;
}

const paymentSchema = new Schema<IPayment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount cannot be negative'],
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: [0, 'Discount amount cannot be negative'],
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: [0, 'Final amount cannot be negative'],
    },
    paymentMethod: {
      type: String,
      enum: ['stripe', 'vnpay', 'momo', 'free', 'sepay'],
      required: [true, 'Payment method is required'],
    },
    
    // Stripe specific
    paymentIntent: {
      type: String,
    },
    stripeCustomerId: {
      type: String,
    },
    
    // VNPay specific
    vnpayTransactionId: {
      type: String,
    },
    vnpayOrderInfo: {
      type: String,
    },
    sepayTransactionId: {
      type: String,
    },
    
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
    },
    
    paidAt: Date,
    refundedAt: Date,
    
    metadata: {
      type: Map,
      of: String,
    },
    
    invoiceUrl: String,
    couponCode: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
paymentSchema.index({ user: 1 });
paymentSchema.index({ course: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentMethod: 1 });
paymentSchema.index({ user: 1, course: 1 });
paymentSchema.index({ createdAt: -1 });
paymentSchema.index({ 'metadata.order_invoice_number': 1 });

// Pre-save hook to calculate final amount
paymentSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isModified('discountAmount')) {
    this.finalAmount = Math.max(0, this.amount - this.discountAmount);
  }
  
  // Set paidAt when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.paidAt) {
    this.paidAt = new Date();
  }
  
  // Set refundedAt when status changes to refunded
  if (this.isModified('status') && this.status === 'refunded' && !this.refundedAt) {
    this.refundedAt = new Date();
  }
  
  next();
});

// Post-save hook to create enrollment when payment is completed
paymentSchema.post('save', async function () {
  if (this.status === 'completed') {
    const Enrollment = mongoose.model('Enrollment');
    
    // Check if enrollment already exists
    const existingEnrollment = await Enrollment.findOne({
      student: this.user,
      course: this.course,
    });
    
    if (!existingEnrollment) {
      console.info('[Payment] Creating enrollment after completed payment', {
        paymentId: this._id.toString(),
        userId: this.user.toString(),
        courseId: this.course.toString(),
      });
      await Enrollment.create({
        student: this.user,
        course: this.course,
        payment: this._id,
        enrolledAt: this.paidAt || new Date(),
      });
    } else {
      console.info('[Payment] Enrollment already exists for payment completion', {
        paymentId: this._id.toString(),
        enrollmentId: existingEnrollment._id.toString(),
      });
    }
  }
});

// Method to mark as completed
paymentSchema.methods.markCompleted = async function (transactionId?: string) {
  console.info('[Payment] markCompleted called', {
    paymentId: this._id.toString(),
    currentStatus: this.status,
    transactionId,
    paymentMethod: this.paymentMethod,
  });
  this.status = 'completed';
  this.paidAt = new Date();
  
  if (transactionId) {
    if (this.paymentMethod === 'stripe') {
      this.paymentIntent = transactionId;
    } else if (this.paymentMethod === 'vnpay') {
      this.vnpayTransactionId = transactionId;
    } else if (this.paymentMethod === 'sepay') {
      this.sepayTransactionId = transactionId;
    }
  }
  
  await this.save();
  console.info('[Payment] markCompleted saved', {
    paymentId: this._id.toString(),
    status: this.status,
    paidAt: this.paidAt,
  });
};

// Method to mark as failed
paymentSchema.methods.markFailed = async function () {
  this.status = 'failed';
  await this.save();
};

// Method to refund
paymentSchema.methods.refund = async function () {
  this.status = 'refunded';
  this.refundedAt = new Date();
  await this.save();
  
  // Optionally, you might want to suspend the enrollment
  const Enrollment = mongoose.model('Enrollment');
  await Enrollment.findOneAndUpdate(
    { student: this.user, course: this.course, payment: this._id },
    { status: 'suspended' }
  );
};

const Payment = mongoose.model<IPayment>('Payment', paymentSchema);

export default Payment;

