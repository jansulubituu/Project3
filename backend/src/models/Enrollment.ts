import mongoose, { Document, Schema } from 'mongoose';

export interface ICompletionSnapshot {
  totalLessons: number;
  publishedLessons: number;
  completedLessons: number;
  completedLessonIds: mongoose.Types.ObjectId[];
  snapshotDate: Date;
  courseVersion?: string;
}

export interface IEnrollment extends Document {
  _id: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  payment?: mongoose.Types.ObjectId;
  enrolledAt: Date;
  progress: number;
  completedLessons: mongoose.Types.ObjectId[];
  completedExams?: mongoose.Types.ObjectId[]; // NEW: Track completed exams
  requiredExams?: mongoose.Types.ObjectId[]; // NEW: Exams required for completion
  totalLessons: number;
  status: 'active' | 'completed' | 'suspended' | 'expired';
  completedAt?: Date;
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateIssuedAt?: Date;
  certificateId?: string;
  completionSnapshot?: ICompletionSnapshot;
  lastAccessed?: Date;
  totalTimeSpent: number;
  hasReviewed: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Methods
  updateProgress(): Promise<void>;
  markLessonComplete(lessonId: mongoose.Types.ObjectId): Promise<void>;
  markExamComplete(examId: mongoose.Types.ObjectId): Promise<void>;
  checkCompletion(): Promise<void>;
  generateCertificate(): Promise<void>;
  hasNewContentSinceCompletion(): Promise<boolean>;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
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
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    completedLessons: [{
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    }],
    completedExams: [{
      type: Schema.Types.ObjectId,
      ref: 'Exam',
    }],
    requiredExams: [{
      type: Schema.Types.ObjectId,
      ref: 'Exam',
    }],
    totalLessons: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'suspended', 'expired'],
      default: 'active',
    },
    completedAt: Date,
    certificateIssued: {
      type: Boolean,
      default: false,
    },
    certificateUrl: String,
    certificateIssuedAt: Date,
    certificateId: String,
    completionSnapshot: {
      totalLessons: Number,
      publishedLessons: Number,
      completedLessons: Number,
      completedLessonIds: [{
        type: Schema.Types.ObjectId,
        ref: 'Lesson',
      }],
      snapshotDate: Date,
      courseVersion: String,
    },
    lastAccessed: Date,
    totalTimeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    hasReviewed: {
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
enrollmentSchema.index({ student: 1 });
enrollmentSchema.index({ course: 1 });
enrollmentSchema.index({ status: 1 });
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });

// Method to update progress
enrollmentSchema.methods.updateProgress = async function () {
  const Course = mongoose.model('Course');
  const Lesson = mongoose.model('Lesson');
  const Exam = mongoose.model('Exam');
  const course = await Course.findById(this.course);
  
  if (course) {
    // 🎯 CRITICAL: Only count PUBLISHED lessons for progress
    // Draft/unpublished lessons should NOT affect completion
    const publishedLessonCount = await Lesson.countDocuments({
      course: this.course,
      isPublished: true,
    });
    
    // Count required exams (exams with status='published' in course)
    const requiredExams = await Exam.find({
      course: this.course,
      status: 'published',
    });
    const totalRequiredExams = requiredExams.length;
    
    // Count how many published lessons student has completed
    const completedPublishedLessons = await Lesson.countDocuments({
      _id: { $in: this.completedLessons },
      isPublished: true,
    });
    
    // Count completed exams - only count exams that are actually passed
    // Check Progress records to verify exam was actually passed
    const Progress = mongoose.model('Progress');
    const completedExamsIds = this.completedExams || [];
    let completedExamsCount = 0;
    
    // Verify each exam in completedExams was actually passed
    for (const examId of completedExamsIds) {
      const examProgress = await Progress.findOne({
        student: this.student,
        exam: examId,
        type: 'exam',
        examPassed: true, // Only count exams that were actually passed
      });
      
      if (examProgress && examProgress.examPassed === true) {
        completedExamsCount++;
      } else {
        // Remove exam from completedExams if it wasn't actually passed
        this.completedExams = this.completedExams.filter(
          (id: mongoose.Types.ObjectId) => id.toString() !== examId.toString()
        );
      }
    }
    
    // Calculate progress: (completedLessons + completedExams) / (totalLessons + totalRequiredExams)
    const totalItems = publishedLessonCount + totalRequiredExams;
    const completedItems = completedPublishedLessons + completedExamsCount;
    
    // 🎯 CRITICAL: For students, totalLessons = published lessons only
    // Students should only see/count published lessons, not draft lessons
    this.totalLessons = publishedLessonCount;
    this.requiredExams = requiredExams.map(e => e._id);
    
    if (totalItems > 0) {
      this.progress = Math.round((completedItems / totalItems) * 100);
    } else {
      this.progress = 0;
    }
    
    console.info('[Enrollment] Progress updated', {
      enrollmentId: this._id.toString(),
      totalLessons: this.totalLessons,
      publishedLessons: publishedLessonCount,
      completedPublished: completedPublishedLessons,
      totalRequiredExams,
      completedExams: completedExamsCount,
      progress: this.progress,
    });
    
    await this.save();
    await this.checkCompletion();
  }
};

// Method to mark lesson as complete
enrollmentSchema.methods.markLessonComplete = async function (
  lessonId: mongoose.Types.ObjectId
) {
  // Check if lesson already completed
  const isAlreadyCompleted = this.completedLessons.some(
    (id: mongoose.Types.ObjectId) => id.toString() === lessonId.toString()
  );
  
  if (!isAlreadyCompleted) {
    this.completedLessons.push(lessonId);
    this.lastAccessed = new Date();
    await this.updateProgress();
  }
};

// Method to mark exam as complete
enrollmentSchema.methods.markExamComplete = async function (
  examId: mongoose.Types.ObjectId
) {
  // Initialize completedExams if not exists
  if (!this.completedExams) {
    this.completedExams = [];
  }
  
  // Check if exam already completed
  const isAlreadyCompleted = this.completedExams.some(
    (id: mongoose.Types.ObjectId) => id.toString() === examId.toString()
  );
  
  if (!isAlreadyCompleted) {
    this.completedExams.push(examId);
    this.lastAccessed = new Date();
    await this.updateProgress();
  }
};

// Method to check if course is completed
enrollmentSchema.methods.checkCompletion = async function () {
  if (this.progress >= 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
    
    // 🎯 SAVE COMPLETION SNAPSHOT
    // This snapshot preserves the state at completion time
    // Certificate remains valid even if new lessons are added later
    
    // Get published lesson count at completion time
    const Lesson = mongoose.model('Lesson');
    const publishedLessonCount = await Lesson.countDocuments({
      course: this.course,
      isPublished: true,
    });
    
    this.completionSnapshot = {
      totalLessons: this.totalLessons,
      publishedLessons: publishedLessonCount,
      completedLessons: this.completedLessons.length,
      completedLessonIds: [...this.completedLessons],
      snapshotDate: new Date(),
      courseVersion: '1.0', // Can be updated to track course versions
    };
    
    await this.save();
    
    console.info('[Enrollment] Course completed with snapshot', {
      enrollmentId: this._id.toString(),
      totalLessons: this.completionSnapshot.totalLessons,
      publishedLessons: this.completionSnapshot.publishedLessons,
      completedLessons: this.completionSnapshot.completedLessons,
    });
    
    // 🎯 AUTO-GENERATE CERTIFICATE
    // Certificate generation happens after completion
    try {
      await this.generateCertificate();
    } catch (error) {
      console.error('[Enrollment] Failed to auto-generate certificate:', error);
      // Don't throw - certificate can be generated manually later
    }
  }
};

// Method to check if course has new content since completion
enrollmentSchema.methods.hasNewContentSinceCompletion = async function (): Promise<boolean> {
  if (!this.completionSnapshot) {
    return false;
  }
  
  // Check if there are new PUBLISHED lessons since completion
  const Lesson = mongoose.model('Lesson');
  const currentPublishedCount = await Lesson.countDocuments({
    course: this.course,
    isPublished: true,
  });
  
  return currentPublishedCount > (this.completionSnapshot.publishedLessons || this.completionSnapshot.totalLessons);
};

// Method to generate certificate
enrollmentSchema.methods.generateCertificate = async function () {
  if (this.certificateIssued) {
    console.info('[Enrollment] Certificate already issued', {
      enrollmentId: this._id.toString(),
    });
    return;
  }

  if (this.progress < 100 || this.status !== 'completed') {
    throw new Error('Course not completed yet. Cannot generate certificate.');
  }

  try {
    console.info('[Enrollment] Generating certificate', {
      enrollmentId: this._id.toString(),
      studentId: this.student.toString(),
      courseId: this.course.toString(),
    });

    // Populate required data
    await this.populate('student', 'fullName email');
    await this.populate('course', 'title');
    await this.populate({
      path: 'course',
      populate: { path: 'instructor', select: 'fullName' },
    });

    interface PopulatedStudent {
      _id: mongoose.Types.ObjectId;
      fullName: string;
      email: string;
    }

    interface PopulatedCourse {
      _id: mongoose.Types.ObjectId;
      title: string;
      instructor?: {
        _id: mongoose.Types.ObjectId;
        fullName: string;
      };
    }

    const student = this.student as unknown as PopulatedStudent;
    const course = this.course as unknown as PopulatedCourse;

    if (!student || !course) {
      throw new Error('Missing student or course data for certificate');
    }

    // Import certificate service dynamically to avoid circular dependency
    const { issueCertificate } = await import('../services/certificateService');
    
    const { certificateUrl, certificateId } = await issueCertificate({
      enrollmentId: this._id.toString(),
      studentName: student.fullName,
      studentEmail: student.email,
      courseTitle: course.title,
      instructorName: course.instructor?.fullName || 'EduLearn Instructor',
      completionDate: this.completedAt || new Date(),
      completedLessons: this.completionSnapshot?.completedLessons || this.completedLessons.length,
      totalLessons: this.completionSnapshot?.totalLessons || this.totalLessons,
      publishedLessons: this.completionSnapshot?.publishedLessons,
    });

    // Update enrollment with certificate info
    this.certificateIssued = true;
    this.certificateUrl = certificateUrl;
    this.certificateIssuedAt = new Date();
    this.certificateId = certificateId;

    await this.save();

    console.info('[Enrollment] Certificate generated successfully', {
      enrollmentId: this._id.toString(),
      certificateId,
      certificateUrl,
    });
    
    return {
      certificateUrl,
      certificateId,
    };
  } catch (error) {
    console.error('[Enrollment] Failed to generate certificate:', {
      enrollmentId: this._id.toString(),
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
};

// Post-save hook to update course enrollment count
enrollmentSchema.post('save', async function () {
  if (this.isNew) {
    const Course = mongoose.model('Course');
    await Course.findByIdAndUpdate(this.course, {
      $inc: { enrollmentCount: 1 },
    });
  }
});

// Pre-deleteOne hook to store courseId before deletion
// This hook runs before deleteOne(), findOneAndDelete(), findByIdAndDelete()
enrollmentSchema.pre('deleteOne', { document: false, query: true }, async function () {
  // Store courseId in the query context for post hook
  const doc = await this.model.findOne(this.getFilter());
  if (doc && doc.course) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any)._courseId = doc.course;
  }
});

// Post-deleteOne hook to decrement course enrollment count
// Note: This hook triggers for deleteOne(), deleteMany(), findOneAndDelete(), findByIdAndDelete()
enrollmentSchema.post('deleteOne', { document: false, query: true }, async function () {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const courseId = (this as any)._courseId;
    if (courseId) {
      const Course = mongoose.model('Course');
      await Course.updateOne(
        { _id: courseId },
        { 
          $inc: { enrollmentCount: -1 },
          $max: { enrollmentCount: 0 }, // Ensure it doesn't go below 0
        }
      );
    }
  } catch (error) {
    // Don't throw error in hook to prevent breaking the delete operation
    console.error('Error in Enrollment post-deleteOne hook:', error);
  }
});

const Enrollment = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);

export default Enrollment;

