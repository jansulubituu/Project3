import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  
  // Content
  lesson: mongoose.Types.ObjectId;  // Required - lesson được comment
  course: mongoose.Types.ObjectId;  // Denormalized - để query nhanh
  parentComment?: mongoose.Types.ObjectId;  // Optional - null nếu là top-level comment
  
  // Author
  author: mongoose.Types.ObjectId;  // User who wrote comment
  authorRole: 'student' | 'instructor' | 'admin';  // Denormalized
  
  // Content
  content: string;  // Required, max 2000 chars
  isEdited: boolean;  // Track if comment was edited
  editedAt?: Date;
  
  // Engagement
  likes: mongoose.Types.ObjectId[];  // Users who liked
  likeCount: number;  // Denormalized for sorting
  
  // Status
  status: 'active' | 'deleted';  // deleted = soft delete
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson is required'],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
      index: true,
    },
    parentComment: {
      type: Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Author is required'],
      index: true,
    },
    authorRole: {
      type: String,
      enum: ['student', 'instructor', 'admin'],
      required: [true, 'Author role is required'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      trim: true,
      minlength: [1, 'Content must be at least 1 character'],
      maxlength: [2000, 'Content cannot exceed 2000 characters'],
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
    }],
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'deleted'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
commentSchema.index({ lesson: 1, status: 1, createdAt: -1 });  // Query comments by lesson
commentSchema.index({ parentComment: 1, status: 1, createdAt: 1 });  // Query replies
commentSchema.index({ author: 1, createdAt: -1 });  // User's comments
commentSchema.index({ course: 1, status: 1, createdAt: -1 });  // Course comments

// Virtual for reply count
commentSchema.virtual('replyCount', {
  ref: 'Comment',
  localField: '_id',
  foreignField: 'parentComment',
  count: true,
  match: { status: 'active' },
});

// Pre-save hook to update likeCount
commentSchema.pre('save', function (next) {
  if (this.isModified('likes')) {
    this.likeCount = this.likes.length;
  }
  next();
});

// Pre-save hook to set editedAt when isEdited changes
commentSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew && !this.isEdited) {
    this.isEdited = true;
    this.editedAt = new Date();
  }
  next();
});

// Validate parentComment is top-level (not a reply itself)
commentSchema.pre('save', async function (next) {
  // Only validate if this is a new document and has a parentComment
  if (this.isNew && this.parentComment) {
    const parent = await mongoose.model('Comment').findById(this.parentComment);
    if (!parent) {
      return next(new Error('Parent comment not found'));
    }
    // If parent has a parentComment, it means it's already a reply
    // We only allow 1 level of nesting
    if (parent.parentComment) {
      return next(new Error('Cannot reply to a reply. Only top-level comments can have replies.'));
    }
  }
  next();
});

const Comment = mongoose.model<IComment>('Comment', commentSchema);

export default Comment;
