import mongoose, { Document, Schema } from 'mongoose';

export interface IAiPromptTemplate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  prompt: string;
  variables?: string[];
  createdBy: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const aiPromptTemplateSchema = new Schema<IAiPromptTemplate>(
  {
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [150, 'Name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    prompt: {
      type: String,
      required: [true, 'Prompt content is required'],
    },
    variables: {
      type: [String],
      default: [],
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

aiPromptTemplateSchema.index({ name: 1, isActive: 1 });
aiPromptTemplateSchema.index({ createdBy: 1 });

const AiPromptTemplate = mongoose.model<IAiPromptTemplate>('AiPromptTemplate', aiPromptTemplateSchema);

export default AiPromptTemplate;

