import mongoose, { Document, Schema } from 'mongoose';

import { QuestionDifficulty, QuestionType } from './Question';

export interface IDifficultyRule {
  level: QuestionDifficulty;
  ratio: number;
}

export interface ITopicRule {
  tag: string;
  ratio: number;
}

export interface ITypeRule {
  type: QuestionType;
  ratio: number;
}

export interface IExamTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;
  title: string;
  description?: string;
  numberOfQuestions: number;
  difficultyDistribution?: IDifficultyRule[];
  topicDistribution?: ITopicRule[];
  typeDistribution?: ITypeRule[];
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const difficultyRuleSchema = new Schema<IDifficultyRule>(
  {
    level: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    ratio: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const topicRuleSchema = new Schema<ITopicRule>(
  {
    tag: { type: String, required: true, trim: true },
    ratio: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const typeRuleSchema = new Schema<ITypeRule>(
  {
    type: { type: String, enum: ['single_choice', 'multiple_choice', 'short_answer'], required: true },
    ratio: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const examTemplateSchema = new Schema<IExamTemplate>(
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
    title: {
      type: String,
      required: [true, 'Template title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    numberOfQuestions: {
      type: Number,
      required: true,
      min: 1,
    },
    difficultyDistribution: {
      type: [difficultyRuleSchema],
      default: [],
    },
    topicDistribution: {
      type: [topicRuleSchema],
      default: [],
    },
    typeDistribution: {
      type: [typeRuleSchema],
      default: [],
    },
    shuffleQuestions: {
      type: Boolean,
      default: true,
    },
    shuffleAnswers: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

examTemplateSchema.index({ course: 1, section: 1, isActive: 1 });

const ExamTemplate = mongoose.model<IExamTemplate>('ExamTemplate', examTemplateSchema);

export default ExamTemplate;

