import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  points: number;
}

export interface IAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ILesson extends Document {
  _id: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: 'video' | 'article' | 'quiz' | 'assignment' | 'resource';
  
  // Video content
  videoUrl?: string;
  videoDuration?: number;
  videoProvider?: 'cloudinary' | 'youtube' | 'vimeo';
  
  // Article content
  articleContent?: string;
  
  // Quiz content
  quizQuestions?: IQuizQuestion[];
  
  // Resources/Attachments
  attachments?: IAttachment[];
  
  order: number;
  duration: number;
  isFree: boolean;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const quizQuestionSchema = new Schema<IQuizQuestion>(
  {
    question: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['multiple_choice', 'true_false', 'short_answer'],
      required: true,
    },
    options: [String],
    correctAnswer: {
      type: String,
      required: true,
    },
    explanation: String,
    points: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { _id: false }
);

const attachmentSchema = new Schema<IAttachment>(
  {
    name: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const lessonSchema = new Schema<ILesson>(
  {
    section: {
      type: Schema.Types.ObjectId,
      ref: 'Section',
      required: [true, 'Section is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    title: {
      type: String,
      required: [true, 'Lesson title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
    },
    type: {
      type: String,
      enum: ['video', 'article', 'quiz', 'assignment', 'resource'],
      required: [true, 'Lesson type is required'],
    },
    
    // Video fields
    videoUrl: {
      type: String,
      validate: {
        validator: function (this: ILesson) {
          return this.type === 'video' ? !!this.videoUrl : true;
        },
        message: 'Video URL is required for video lessons',
      },
    },
    videoDuration: {
      type: Number,
      min: 0,
    },
    videoProvider: {
      type: String,
      enum: ['cloudinary', 'youtube', 'vimeo'],
      default: 'cloudinary',
    },
    
    // Article fields
    articleContent: {
      type: String,
      validate: {
        validator: function (this: ILesson) {
          return this.type === 'article' ? !!this.articleContent : true;
        },
        message: 'Article content is required for article lessons',
      },
    },
    
    // Quiz fields
    quizQuestions: {
      type: [quizQuestionSchema],
      validate: {
        validator: function (this: ILesson, value: IQuizQuestion[]) {
          return this.type === 'quiz' ? value && value.length > 0 : true;
        },
        message: 'Quiz must have at least one question',
      },
    },
    
    // Attachments
    attachments: [attachmentSchema],
    
    order: {
      type: Number,
      required: [true, 'Order is required'],
      min: 1,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
    isFree: {
      type: Boolean,
      default: false,
    },
    isPublished: {
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

// Indexes
lessonSchema.index({ section: 1 });
lessonSchema.index({ course: 1 });
lessonSchema.index({ section: 1, order: 1 });

// Compound unique index to prevent duplicate orders in same section
lessonSchema.index({ section: 1, order: 1 }, { unique: true });

// Pre-save hook to update duration from video duration
lessonSchema.pre('save', function (next) {
  if (this.type === 'video' && this.videoDuration) {
    // Convert video duration from seconds to minutes
    this.duration = Math.ceil(this.videoDuration / 60);
  }
  next();
});

// Post-save hook to update section statistics
lessonSchema.post('save', async function () {
  const Section = mongoose.model('Section');
  const section = await Section.findById(this.section);
  if (section && typeof section.updateStatistics === 'function') {
    await section.updateStatistics();
  }
  
  // 🎯 CRITICAL: Update course.publishedLessonCount when isPublished changes
  // This ensures publishedLessonCount is always accurate
  if (this.isModified('isPublished') && this.course) {
    const Course = mongoose.model('Course');
    const publishedCount = await mongoose.model('Lesson').countDocuments({
      course: this.course,
      isPublished: true,
    });
    
    await Course.findByIdAndUpdate(this.course, {
      publishedLessonCount: publishedCount,
    });
    
    console.info('[Lesson] Updated course.publishedLessonCount', {
      lessonId: this._id.toString(),
      courseId: this.course.toString(),
      isPublished: this.isPublished,
      publishedCount,
    });
  }
});

// Post-deleteOne hook to update section statistics
lessonSchema.post('deleteOne', async function () {
  const Section = mongoose.model('Section');
  const Lesson = mongoose.model('Lesson');
  const Course = mongoose.model('Course');
  const doc = await this.model.findOne(this.getFilter());
  
  if (doc) {
    const section = await Section.findById(doc.section);
    if (section && typeof section.updateStatistics === 'function') {
      await section.updateStatistics();
    }
    
    // 🎯 CRITICAL: Update course.publishedLessonCount when lesson is deleted
    // Only count published lessons that still exist (not deleted)
    if (doc.course) {
      const publishedCount = await Lesson.countDocuments({
        course: doc.course,
        isPublished: true,
      });
      
      await Course.findByIdAndUpdate(doc.course, {
        publishedLessonCount: publishedCount,
      });
      
      console.info('[Lesson] Updated course.publishedLessonCount after delete', {
        lessonId: doc._id.toString(),
        courseId: doc.course.toString(),
        publishedCount,
      });
    }
  }
});

const Lesson = mongoose.model<ILesson>('Lesson', lessonSchema);

export default Lesson;

