import mongoose, { Document, Schema } from 'mongoose';

export type ExamAttemptStatus = 'in_progress' | 'submitted' | 'expired' | 'abandoned';

export interface IExamAnswer {
  question: mongoose.Types.ObjectId;
  answerSingle?: string;
  answerMultiple?: string[];
  answerText?: string;
  isCorrect?: boolean;
  score?: number;
  maxScore?: number;
}

export interface IExamAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;
  startedAt: Date;
  submittedAt?: Date | null;
  expiresAt?: Date | null;
  status: ExamAttemptStatus;
  answers: IExamAnswer[];
  score: number;
  maxScore: number;
  passed: boolean;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const examAnswerSchema = new Schema<IExamAnswer>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    answerSingle: { type: String },
    answerMultiple: { type: [String], default: undefined },
    answerText: { type: String },
    isCorrect: { type: Boolean },
    score: { type: Number }, // Allow negative scores for negative marking
    maxScore: { type: Number, min: 0 },
  },
  { _id: false }
);

const examAttemptSchema = new Schema<IExamAttempt>(
  {
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: [true, 'Exam is required'],
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['in_progress', 'submitted', 'expired', 'abandoned'],
      default: 'in_progress',
    },
    answers: {
      type: [examAnswerSchema],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
      // Allow negative scores (for negative marking), but controller ensures final score >= 0
    },
    maxScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

examAttemptSchema.index({ exam: 1, student: 1, status: 1 });
examAttemptSchema.index({ course: 1, student: 1 });

const ExamAttempt = mongoose.model<IExamAttempt>('ExamAttempt', examAttemptSchema);

export default ExamAttempt;

