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
  lesson?: mongoose.Types.ObjectId; // Optional - for lesson progress
  exam?: mongoose.Types.ObjectId; // Optional - for exam progress
  course: mongoose.Types.ObjectId;
  type: 'lesson' | 'exam'; // Distinguish progress type
  status: 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
  lastPosition: number;
  watchedDuration: number;
  quizAttempts?: number;
  quizScore?: number;
  quizAnswers?: IQuizAnswer[];
  timeSpent: number;
  startedAt?: Date;
  completedAt?: Date;
  lastAccessedAt: Date;
  // Exam-specific fields
  examAttempts?: number;
  examBestScore?: number;
  examLatestScore?: number;
  examPassed?: boolean;
  examLastAttemptAt?: Date;
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
      required: function() { return this.type === 'lesson'; },
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: 'Exam',
      required: function() { return this.type === 'exam'; },
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    type: {
      type: String,
      enum: ['lesson', 'exam'],
      required: [true, 'Progress type is required'],
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed', 'passed', 'failed'],
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
    // Exam-specific fields (only for type='exam')
    examAttempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    examBestScore: {
      type: Number,
      min: 0,
    },
    examLatestScore: {
      type: Number,
      min: 0,
    },
    examPassed: {
      type: Boolean,
      default: false,
    },
    examLastAttemptAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
progressSchema.index({ enrollment: 1 });
progressSchema.index({ enrollment: 1, type: 1 });
progressSchema.index({ student: 1 });
progressSchema.index({ lesson: 1 });
progressSchema.index({ exam: 1 });
progressSchema.index({ course: 1 });
progressSchema.index({ student: 1, lesson: 1 }, { unique: true, sparse: true });
progressSchema.index({ student: 1, exam: 1 }, { unique: true, sparse: true });
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
  try {
    const Enrollment = mongoose.model('Enrollment');
    const enrollment = await Enrollment.findById(this.enrollment);
    
    if (!enrollment) {
      console.warn(`Enrollment not found for progress ${this._id}`);
      return;
    }
    
    let needsSave = false;
    
    // Update totalTimeSpent in enrollment - recalculate from all progress records
    if (this.isModified('timeSpent') || this.isNew) {
      const Progress = mongoose.model('Progress');
      const allProgress = await Progress.find({ enrollment: this.enrollment });
      const totalTime = allProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);
      enrollment.totalTimeSpent = totalTime;
      needsSave = true;
    }
    
    // Update lastAccessed in enrollment
    if (this.isModified('lastAccessedAt') || this.isNew) {
      enrollment.lastAccessed = this.lastAccessedAt;
      needsSave = true;
    }
    
    // Mark lesson as complete if status is completed (for lesson type)
    if (this.type === 'lesson' && this.status === 'completed') {
      // Check if lesson is already in completedLessons to avoid duplicate
      const lessonIdStr = this.lesson?.toString();
      if (lessonIdStr) {
        const isAlreadyCompleted = enrollment.completedLessons.some(
          (id: any) => id.toString() === lessonIdStr
        );
        
        if (!isAlreadyCompleted) {
          console.log(`Marking lesson ${this.lesson} as complete in enrollment ${enrollment._id}`);
          if (typeof enrollment.markLessonComplete === 'function') {
            await enrollment.markLessonComplete(this.lesson);
            // markLessonComplete already calls save(), so we don't need to save again
            needsSave = false;
          } else {
            console.error('markLessonComplete method not found on enrollment');
            // Fallback: manually add lesson to completedLessons
            enrollment.completedLessons.push(this.lesson);
            await enrollment.updateProgress();
            needsSave = false;
          }
        }
      }
    }
    
    // Mark exam as complete if passed (for exam type)
    if (this.type === 'exam' && this.examPassed) {
      const examIdStr = this.exam?.toString();
      if (examIdStr) {
        const isAlreadyCompleted = enrollment.completedExams?.some(
          (id: any) => id.toString() === examIdStr
        ) || false;
        
        if (!isAlreadyCompleted) {
          console.log(`Marking exam ${this.exam} as complete in enrollment ${enrollment._id}`);
          if (typeof enrollment.markExamComplete === 'function') {
            await enrollment.markExamComplete(this.exam);
            // markExamComplete already calls save(), so we don't need to save again
            needsSave = false;
          } else {
            console.error('markExamComplete method not found on enrollment');
            // Fallback: manually add exam to completedExams
            if (!enrollment.completedExams) {
              enrollment.completedExams = [];
            }
            enrollment.completedExams.push(this.exam);
            await enrollment.updateProgress();
            needsSave = false;
          }
        }
      }
    }
    
    // Save enrollment if needed (for timeSpent and lastAccessed updates)
    if (needsSave) {
      await enrollment.save();
    }
  } catch (error) {
    console.error('Error in Progress post-save hook:', error);
    // Don't throw error to prevent breaking the save operation
  }
});

// Method to mark as completed
progressSchema.methods.markCompleted = async function () {
  // Explicitly mark status as modified to ensure post-save hook triggers
  this.status = 'completed';
  this.completedAt = new Date();
  this.markModified('status'); // Explicitly mark as modified
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

