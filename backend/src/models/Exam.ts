import mongoose, { Document, Schema } from 'mongoose';

import { QuestionType } from './Question';

export type ExamStatus = 'draft' | 'published' | 'archived';
export type ScoringMethod = 'highest' | 'latest' | 'average';
export type ShowCorrectAnswers = 'never' | 'after_submit' | 'after_close';

export interface IExamQuestionRef {
  question: mongoose.Types.ObjectId;
  weight?: number;
  order?: number;
  type?: QuestionType;
  questionPoints?: number; // Override points from Question. If provided, use this instead of question.points
}

export interface IExam extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string;
  slug: string;
  status: ExamStatus;
  questions: IExamQuestionRef[];
  totalPoints: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  openAt?: Date | null;
  closeAt?: Date | null;
  durationMinutes: number;
  maxAttempts?: number | null;
  scoringMethod: ScoringMethod;
  showCorrectAnswers: ShowCorrectAnswers;
  showScoreToStudent: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercent: number;
  timeLimitType: 'per_attempt' | 'global_window';
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const examQuestionSchema = new Schema<IExamQuestionRef>(
  {
    question: { type: Schema.Types.ObjectId, ref: 'Question', required: true },
    weight: { type: Number, default: 1, min: 0 },
    order: { type: Number, default: 0, min: 0 },
    type: { type: String, enum: ['single_choice', 'multiple_choice', 'short_answer'], required: false },
    questionPoints: { type: Number, default: undefined, min: 0 }, // Optional override for question points
  },
  { _id: false }
);

const examSchema = new Schema<IExam>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      lowercase: true,
      trim: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    questions: {
      type: [examQuestionSchema],
      default: [],
    },
    totalPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    passingScore: {
      type: Number,
      default: 0,
      min: 0,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleAnswers: {
      type: Boolean,
      default: false,
    },
    openAt: {
      type: Date,
      default: null,
    },
    closeAt: {
      type: Date,
      default: null,
    },
    durationMinutes: {
      type: Number,
      default: 60,
      min: 1,
    },
    maxAttempts: {
      type: Number,
      default: null,
      min: 1,
    },
    scoringMethod: {
      type: String,
      enum: ['highest', 'latest', 'average'],
      default: 'highest',
    },
    showCorrectAnswers: {
      type: String,
      enum: ['never', 'after_submit', 'after_close'],
      default: 'after_submit',
    },
    showScoreToStudent: {
      type: Boolean,
      default: true,
    },
    allowLateSubmission: {
      type: Boolean,
      default: false,
    },
    latePenaltyPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    timeLimitType: {
      type: String,
      enum: ['per_attempt', 'global_window'],
      default: 'per_attempt',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

examSchema.index({ course: 1, section: 1, status: 1 });
examSchema.index({ openAt: 1, closeAt: 1 });
examSchema.index({ slug: 1 });

const Exam = mongoose.model<IExam>('Exam', examSchema);

export default Exam;

