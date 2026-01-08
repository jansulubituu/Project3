import mongoose, { Document, Schema } from 'mongoose';

export type AiInputType = 'uploaded_file' | 'course_material' | 'prompt_only';
export type AiJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IAiSource {
  type: 'lesson' | 'file' | 'url' | 'text';
  lessonId?: mongoose.Types.ObjectId;
  fileId?: mongoose.Types.ObjectId;
  url?: string;
  textExcerpt?: string;
}

export interface IAiGenerationJob extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section?: mongoose.Types.ObjectId | null;
  inputType: AiInputType;
  sources: IAiSource[];
  prompt: string;
  targetTemplate?: mongoose.Types.ObjectId | null;
  targetExam?: mongoose.Types.ObjectId | null;
  status: AiJobStatus;
  resultExamId?: mongoose.Types.ObjectId | null;
  resultQuestionIds?: mongoose.Types.ObjectId[];
  provider?: string;
  aiModel?: string;
  logs?: string;
  errorMessage?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const aiSourceSchema = new Schema<IAiSource>(
  {
    type: {
      type: String,
      enum: ['lesson', 'file', 'url', 'text'],
      required: true,
    },
    lessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
    fileId: { type: Schema.Types.ObjectId },
    url: { type: String },
    textExcerpt: { type: String },
  },
  { _id: false }
);

const aiGenerationJobSchema = new Schema<IAiGenerationJob>(
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
    inputType: {
      type: String,
      enum: ['uploaded_file', 'course_material', 'prompt_only'],
      required: [true, 'Input type is required'],
    },
    sources: {
      type: [aiSourceSchema],
      default: [],
    },
    prompt: {
      type: String,
      required: [true, 'Prompt is required'],
    },
    targetTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'ExamTemplate',
      default: null,
    },
    targetExam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    resultExamId: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      default: null,
    },
    resultQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },
    provider: {
      type: String,
    },
    aiModel: {
      type: String,
    },
    logs: {
      type: String,
    },
    errorMessage: {
      type: String,
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

aiGenerationJobSchema.index({ course: 1, status: 1 });
aiGenerationJobSchema.index({ createdBy: 1, status: 1 });

const AiGenerationJob = mongoose.model<IAiGenerationJob>('AiGenerationJob', aiGenerationJobSchema);

export default AiGenerationJob;

