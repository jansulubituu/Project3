import mongoose, { Document, Schema } from 'mongoose';

export interface ISection extends Document {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  duration: number;
  lessonCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const sectionSchema = new Schema<ISection>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: [true, 'Course is required'],
    },
    title: {
      type: String,
      required: [true, 'Section title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
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
    lessonCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
sectionSchema.index({ course: 1 });
sectionSchema.index({ course: 1, order: 1 });

// Compound unique index to prevent duplicate orders in same course
sectionSchema.index({ course: 1, order: 1 }, { unique: true });

// Virtual for lessons
sectionSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'section',
  options: { sort: { order: 1 } },
});

// Method to update section statistics
sectionSchema.methods.updateStatistics = async function () {
  const Lesson = mongoose.model('Lesson');
  const lessons = await Lesson.find({ section: this._id });
  
  this.lessonCount = lessons.length;
  this.duration = lessons.reduce((total, lesson) => total + (lesson.duration || 0), 0);
  
  await this.save();
  
  // Also update course statistics
  const Course = mongoose.model('Course');
  const course = await Course.findById(this.course);
  if (course) {
    const sections = await mongoose.model('Section').find({ course: this.course });
    
    // Count all lessons
    course.totalDuration = sections.reduce((total, section) => total + section.duration, 0);
    course.totalLessons = sections.reduce((total, section) => total + section.lessonCount, 0);
    
    // Count only published lessons
    const publishedLessons = await Lesson.countDocuments({
      course: this.course,
      isPublished: true,
    });
    course.publishedLessonCount = publishedLessons;
    
    await course.save();
  }
};

// Post-deleteOne hook to update course statistics
sectionSchema.post('deleteOne', async function () {
  const Course = mongoose.model('Course');
  const Lesson = mongoose.model('Lesson');
  const doc = await this.model.findOne(this.getFilter());
  
  if (doc) {
    // Delete all lessons in this section
    await Lesson.deleteMany({ section: doc._id });
    
    // Update course statistics
    const course = await Course.findById(doc.course);
    if (course) {
      const sections = await mongoose.model('Section').find({ course: doc.course });
      course.totalDuration = sections.reduce((total, section) => total + section.duration, 0);
      course.totalLessons = sections.reduce((total, section) => total + section.lessonCount, 0);
      
      // Count only published lessons
      const publishedLessons = await Lesson.countDocuments({
        course: doc.course,
        isPublished: true,
      });
      course.publishedLessonCount = publishedLessons;
      
      await course.save();
    }
  }
});

const Section = mongoose.model<ISection>('Section', sectionSchema);

export default Section;

