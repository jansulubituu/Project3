import mongoose, { Document, Schema } from 'mongoose';

export interface ICompletionSnapshot {
  totalLessons: number;
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
  checkCompletion(): Promise<void>;
  generateCertificate(): Promise<void>;
  hasNewContentSinceCompletion(): boolean;
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
  const course = await Course.findById(this.course);
  
  if (course) {
    this.totalLessons = course.totalLessons;
    
    if (this.totalLessons > 0) {
      this.progress = Math.round((this.completedLessons.length / this.totalLessons) * 100);
    } else {
      this.progress = 0;
    }
    
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

// Method to check if course is completed
enrollmentSchema.methods.checkCompletion = async function () {
  if (this.progress >= 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedAt = new Date();
    
    // 🎯 SAVE COMPLETION SNAPSHOT
    // This snapshot preserves the state at completion time
    // Certificate remains valid even if new lessons are added later
    this.completionSnapshot = {
      totalLessons: this.totalLessons,
      completedLessons: this.completedLessons.length,
      completedLessonIds: [...this.completedLessons],
      snapshotDate: new Date(),
      courseVersion: '1.0', // Can be updated to track course versions
    };
    
    await this.save();
    
    console.info('[Enrollment] Course completed with snapshot', {
      enrollmentId: this._id.toString(),
      totalLessons: this.completionSnapshot.totalLessons,
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
enrollmentSchema.methods.hasNewContentSinceCompletion = function (): boolean {
  if (!this.completionSnapshot) {
    return false;
  }
  
  return this.totalLessons > this.completionSnapshot.totalLessons;
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
    (this as any)._courseId = doc.course;
  }
});

// Post-deleteOne hook to decrement course enrollment count
// Note: This hook triggers for deleteOne(), deleteMany(), findOneAndDelete(), findByIdAndDelete()
enrollmentSchema.post('deleteOne', { document: false, query: true }, async function () {
  try {
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

