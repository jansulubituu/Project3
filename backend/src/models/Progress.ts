import mongoose, { Document, Schema } from 'mongoose';

export interface IQuizAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
}

export interface IProgress extends Document {
  _id: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  lesson: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  status: 'not_started' | 'in_progress' | 'completed';
  lastPosition: number;
  watchedDuration: number;
  quizAttempts?: number;
  quizScore?: number;
  quizAnswers?: IQuizAnswer[];
  timeSpent: number;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const quizAnswerSchema = new Schema<IQuizAnswer>(
  {
    questionId: {
      type: String,
      required: true,
    },
    answer: {
      type: String,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const progressSchema = new Schema<IProgress>(
  {
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required'],
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
      required: [true, 'Lesson is required'],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    lastPosition: {
      type: Number,
      default: 0,
      min: 0,
    },
    watchedDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    quizAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    quizScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    quizAnswers: [quizAnswerSchema],
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    startedAt: Date,
    completedAt: Date,
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
progressSchema.index({ enrollment: 1 });
progressSchema.index({ student: 1 });
progressSchema.index({ lesson: 1 });
progressSchema.index({ course: 1 });
progressSchema.index({ student: 1, lesson: 1 }, { unique: true });
progressSchema.index({ enrollment: 1, status: 1 });

// Pre-save hook to set startedAt
progressSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'in_progress' && !this.startedAt) {
      this.startedAt = new Date();
    }
    
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
  }
  
  // Update lastAccessedAt
  this.lastAccessedAt = new Date();
  
  next();
});

// Post-save hook to update enrollment progress
progressSchema.post('save', async function () {
  if (this.isModified('status') && this.status === 'completed') {
    const Enrollment = mongoose.model('Enrollment');
    const enrollment = await Enrollment.findById(this.enrollment);
    
    if (enrollment && typeof enrollment.markLessonComplete === 'function') {
      await enrollment.markLessonComplete(this.lesson);
    }
  }
});

// Method to mark as completed
progressSchema.methods.markCompleted = async function () {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
};

// Method to update video progress
progressSchema.methods.updateVideoProgress = async function (
  position: number,
  duration: number
) {
  this.lastPosition = position;
  this.watchedDuration = Math.max(this.watchedDuration, duration);
  
  // Auto-complete if watched > 90%
  const Lesson = mongoose.model('Lesson');
  const lesson = await Lesson.findById(this.lesson);
  
  if (lesson && lesson.videoDuration) {
    const watchedPercentage = (this.watchedDuration / lesson.videoDuration) * 100;
    
    if (watchedPercentage >= 90 && this.status !== 'completed') {
      await this.markCompleted();
    } else if (this.status === 'not_started') {
      this.status = 'in_progress';
    }
  }
  
  await this.save();
};

// Method to submit quiz
progressSchema.methods.submitQuiz = async function (answers: IQuizAnswer[]) {
  this.quizAttempts = (this.quizAttempts || 0) + 1;
  this.quizAnswers = answers;
  
  // Calculate score
  const correctAnswers = answers.filter((a) => a.isCorrect).length;
  this.quizScore = Math.round((correctAnswers / answers.length) * 100);
  
  // Mark as completed if score >= 70%
  if (this.quizScore >= 70) {
    await this.markCompleted();
  }
  
  await this.save();
};

const Progress = mongoose.model<IProgress>('Progress', progressSchema);

export default Progress;

