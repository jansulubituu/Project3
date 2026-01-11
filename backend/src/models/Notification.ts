import mongoose, { Document, Schema } from 'mongoose';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  type: 'enrollment' | 'course_update' | 'new_lesson' | 'certificate' | 'review' | 'instructor_response' | 'payment' | 'system' | 'comment' | 'comment_reply';
  title: string;
  message: string;
  link?: string;
  data?: Map<string, string>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
    type: {
      type: String,
      enum: [
        'enrollment',
        'course_update',
        'new_lesson',
        'certificate',
        'review',
        'instructor_response',
        'payment',
        'system',
        'comment',
        'comment_reply',
      ],
      required: [true, 'Type is required'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      maxlength: [500, 'Message cannot exceed 500 characters'],
    },
    link: {
      type: String,
      maxlength: [500, 'Link cannot exceed 500 characters'],
    },
    data: {
      type: Map,
      of: String,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
notificationSchema.index({ user: 1 });
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });

// Pre-save hook to set readAt
notificationSchema.pre('save', function (next) {
  if (this.isModified('isRead') && this.isRead && !this.readAt) {
    this.readAt = new Date();
  }
  next();
});

// Static method to create notification
notificationSchema.statics.createNotification = async function (data: {
  user: mongoose.Types.ObjectId;
  type: INotification['type'];
  title: string;
  message: string;
  link?: string;
  data?: Map<string, string>;
}) {
  return await this.create(data);
};

// Static method to mark all as read
notificationSchema.statics.markAllAsRead = async function (
  userId: mongoose.Types.ObjectId
) {
  return await this.updateMany(
    { user: userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = async function (days: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return await this.deleteMany({
    isRead: true,
    readAt: { $lt: cutoffDate },
  });
};

// Method to mark as read
notificationSchema.methods.markAsRead = async function () {
  this.isRead = true;
  this.readAt = new Date();
  await this.save();
};

const Notification = mongoose.model<INotification>('Notification', notificationSchema);

export default Notification;

