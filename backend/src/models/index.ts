/**
 * Models Index
 * 
 * Central export file for all MongoDB models
 * Import models using: import { User, Course, ... } from '@/models'
 */

import User, { IUser } from './User';
import Category, { ICategory } from './Category';
import Course, { ICourse } from './Course';
import Section, { ISection } from './Section';
import Lesson, { ILesson, IQuizQuestion, IAttachment } from './Lesson';
import Enrollment, { IEnrollment } from './Enrollment';
import Progress, { IProgress, IQuizAnswer } from './Progress';
import Review, { IReview, IHelpfulVote } from './Review';
import Payment, { IPayment } from './Payment';
import Notification, { INotification } from './Notification';
import LandingPageConfig, { ILandingPageConfig, IFeature } from './LandingPageConfig';

// Export models
export {
  User,
  Category,
  Course,
  Section,
  Lesson,
  Enrollment,
  Progress,
  Review,
  Payment,
  Notification,
  LandingPageConfig,
};

// Export interfaces
export type {
  IUser,
  ICategory,
  ICourse,
  ISection,
  ILesson,
  IQuizQuestion,
  IAttachment,
  IEnrollment,
  IProgress,
  IQuizAnswer,
  IReview,
  IHelpfulVote,
  IPayment,
  INotification,
  ILandingPageConfig,
  IFeature,
};

// Export default object with all models
export default {
  User,
  Category,
  Course,
  Section,
  Lesson,
  Enrollment,
  Progress,
  Review,
  Payment,
  Notification,
  LandingPageConfig,
};

