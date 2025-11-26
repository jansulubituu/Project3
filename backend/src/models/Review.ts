import mongoose, { Document, Schema } from 'mongoose';

export interface IHelpfulVote {
  user: mongoose.Types.ObjectId;
  isHelpful: boolean;
}

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  enrollment: mongoose.Types.ObjectId;
  rating: number;
  comment: string;
  isPublished: boolean;
  moderatedBy?: mongoose.Types.ObjectId;
  moderatedAt?: Date;
  moderationNote?: string;
  helpfulCount: number;
  helpfulVotes: IHelpfulVote[];
  instructorResponse?: string;
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const helpfulVoteSchema = new Schema<IHelpfulVote>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isHelpful: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const reviewSchema = new Schema<IReview>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Student is required'],
    },
    enrollment: {
      type: Schema.Types.ObjectId,
      ref: 'Enrollment',
      required: [true, 'Enrollment is required'],
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      required: [true, 'Comment is required'],
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    moderatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatedAt: Date,
    moderationNote: String,
    helpfulCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    helpfulVotes: [helpfulVoteSchema],
    instructorResponse: {
      type: String,
      maxlength: [500, 'Response cannot exceed 500 characters'],
    },
    respondedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
reviewSchema.index({ course: 1 });
reviewSchema.index({ student: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ isPublished: 1 });
reviewSchema.index({ course: 1, student: 1 }, { unique: true });
reviewSchema.index({ createdAt: -1 });

// Post-save hook to update course rating
reviewSchema.post('save', async function () {
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  
  if (course && typeof course.calculateAverageRating === 'function') {
    await course.calculateAverageRating();
  }
  
  // Update enrollment hasReviewed flag
  if (this.isNew) {
    const Enrollment = mongoose.model('Enrollment');
    await Enrollment.findByIdAndUpdate(this.enrollment, {
      hasReviewed: true,
    });
  }
});

// Post-deleteOne hook to update course rating
reviewSchema.post('deleteOne', async function () {
  const Course = mongoose.model('Course');
  const doc = await this.model.findOne(this.getFilter());
  
  if (doc) {
    const course = await Course.findById(doc.course);
    if (course && typeof course.calculateAverageRating === 'function') {
      await course.calculateAverageRating();
    }
    
    // Update enrollment hasReviewed flag
    const Enrollment = mongoose.model('Enrollment');
    await Enrollment.findByIdAndUpdate(doc.enrollment, {
      hasReviewed: false,
    });
  }
});

// Method to add helpful vote
reviewSchema.methods.addHelpfulVote = async function (
  userId: mongoose.Types.ObjectId,
  isHelpful: boolean
) {
  // Remove existing vote from this user
  this.helpfulVotes = this.helpfulVotes.filter(
    (vote: IHelpfulVote) => vote.user.toString() !== userId.toString()
  );
  
  // Add new vote
  this.helpfulVotes.push({ user: userId, isHelpful });
  
  // Recalculate helpful count
  this.helpfulCount = this.helpfulVotes.filter((vote: IHelpfulVote) => vote.isHelpful).length;
  
  await this.save();
};

// Method to add instructor response
reviewSchema.methods.addInstructorResponse = async function (response: string) {
  this.instructorResponse = response;
  this.respondedAt = new Date();
  await this.save();
};

const Review = mongoose.model<IReview>('Review', reviewSchema);

export default Review;

