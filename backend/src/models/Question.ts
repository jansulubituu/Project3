import mongoose, { Document, Schema } from 'mongoose';

export type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';

export interface IQuestionImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface IChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
  image?: IQuestionImage;
}

export interface IQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;
  owner: mongoose.Types.ObjectId;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string;
  images?: IQuestionImage[];
  options?: IChoiceOption[];
  expectedAnswers?: string[];
  caseSensitive?: boolean;
  maxSelectable?: number | null;
  points: number;
  negativeMarking: boolean;
  negativePoints?: number;
  tags?: string[];
  topic?: string;
  cognitiveLevel?: string;
  isActive: boolean;
  version: number;
  parentQuestion?: mongoose.Types.ObjectId | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const imageSchema = new Schema<IQuestionImage>(
  {
    url: { type: String, required: true },
    alt: { type: String },
    caption: { type: String },
  },
  { _id: false }
);

const choiceOptionSchema = new Schema<IChoiceOption>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    image: { type: imageSchema },
  },
  { _id: false }
);

const questionSchema = new Schema<IQuestion>(
  {
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
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner is required'],
    },
    type: {
      type: String,
      enum: ['single_choice', 'multiple_choice', 'short_answer'],
      required: [true, 'Question type is required'],
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium',
    },
    text: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    images: [imageSchema],
    options: [choiceOptionSchema],
    expectedAnswers: {
      type: [String],
      default: undefined,
    },
    caseSensitive: {
      type: Boolean,
      default: false,
    },
    maxSelectable: {
      type: Number,
      default: null,
      min: 1,
    },
    points: {
      type: Number,
      default: 1,
      min: 0,
    },
    negativeMarking: {
      type: Boolean,
      default: false,
    },
    negativePoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    topic: {
      type: String,
      trim: true,
    },
    cognitiveLevel: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    parentQuestion: {
      type: Schema.Types.ObjectId,
      ref: 'Question',
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

questionSchema.index({ course: 1, type: 1 });
questionSchema.index({ course: 1, difficulty: 1 });
questionSchema.index({ course: 1, tags: 1 });
questionSchema.index({ parentQuestion: 1, version: 1 });

const Question = mongoose.model<IQuestion>('Question', questionSchema);

export default Question;

