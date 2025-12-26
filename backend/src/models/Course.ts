import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  instructor: mongoose.Types.ObjectId;
  category: mongoose.Types.ObjectId;
  subcategory?: mongoose.Types.ObjectId;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  thumbnail: string;
  previewVideo?: string;
  price: number;
  discountPrice?: number;
  currency: string;
  language: string;
  requirements: string[];
  learningOutcomes: string[];
  targetAudience: string[];
  tags: string[];
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  enrollmentCount: number;
  averageRating: number;
  totalReviews: number;
  totalDuration: number;
  totalLessons: number;
  publishedLessonCount: number;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
  isPublished: boolean;
  publishedAt?: Date;
  // Approval workflow fields
  rejectionReason?: string;
  rejectedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: {
      type: String,
      required: [true, 'Course title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      required: [true, 'Slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      minlength: [50, 'Description must be at least 50 characters'],
    },
    shortDescription: {
      type: String,
      required: [true, 'Short description is required'],
      maxlength: [200, 'Short description cannot exceed 200 characters'],
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Instructor is required'],
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subcategory: {
      type: Schema.Types.ObjectId,
      ref: 'Category',
    },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'all_levels'],
      default: 'all_levels',
    },
    thumbnail: {
      type: String,
      required: [true, 'Thumbnail is required'],
    },
    previewVideo: {
      type: String,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    discountPrice: {
      type: Number,
      min: [0, 'Discount price cannot be negative'],
      validate: {
        validator: function (this: ICourse, value: number) {
          return !value || value < this.price;
        },
        message: 'Discount price must be less than regular price',
      },
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
    },
    language: {
      type: String,
      required: [true, 'Language is required'],
      default: 'English',
    },
    requirements: {
      type: [String],
      default: [],
    },
    learningOutcomes: {
      type: [String],
      required: [true, 'Learning outcomes are required'],
      validate: {
        validator: function (value: string[]) {
          return value.length >= 4;
        },
        message: 'Must have at least 4 learning outcomes',
      },
    },
    targetAudience: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['draft', 'pending', 'published', 'rejected', 'archived'],
      default: 'draft',
    },
    
    // Statistics
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDuration: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalLessons: {
      type: Number,
      default: 0,
      min: 0,
    },
    publishedLessonCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // SEO
    metaTitle: {
      type: String,
      maxlength: [100, 'Meta title cannot exceed 100 characters'],
    },
    metaDescription: {
      type: String,
      maxlength: [200, 'Meta description cannot exceed 200 characters'],
    },
    metaKeywords: {
      type: [String],
      default: [],
    },
    
    // Publishing
    isPublished: {
      type: Boolean,
      default: false,
    },
    publishedAt: {
      type: Date,
    },
    
    // Approval workflow
    rejectionReason: {
      type: String,
      maxlength: [500, 'Rejection reason cannot exceed 500 characters'],
    },
    rejectedAt: {
      type: Date,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    submittedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
courseSchema.index({ slug: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ category: 1 });
courseSchema.index({ status: 1 });
courseSchema.index({ isPublished: 1 });
courseSchema.index({ price: 1 });
courseSchema.index({ averageRating: -1 });
courseSchema.index({ enrollmentCount: -1 });
courseSchema.index({ createdAt: -1 });

// Text index for search
courseSchema.index({
  title: 'text',
  description: 'text',
  tags: 'text',
});

// Compound indexes
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ category: 1, price: 1 });

// Virtual for sections
courseSchema.virtual('sections', {
  ref: 'Section',
  localField: '_id',
  foreignField: 'course',
});

// Virtual for enrollments
courseSchema.virtual('enrollments', {
  ref: 'Enrollment',
  localField: '_id',
  foreignField: 'course',
});

// Virtual for reviews
courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'course',
});

// Pre-save hook to generate slug from title if not provided
courseSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }
  
  // Set publishedAt if being published
  if (this.isModified('isPublished') && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

// Method to calculate average rating
courseSchema.methods.calculateAverageRating = async function () {
  const Review = mongoose.model('Review');
  const stats = await Review.aggregate([
    { $match: { course: this._id, isPublished: true } },
    {
      $group: {
        _id: '$course',
        averageRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);
  
  if (stats.length > 0) {
    this.averageRating = Math.round(stats[0].averageRating * 10) / 10;
    this.totalReviews = stats[0].totalReviews;
  } else {
    this.averageRating = 0;
    this.totalReviews = 0;
  }
  
  await this.save();
};

const Course = mongoose.model<ICourse>('Course', courseSchema);

export default Course;

