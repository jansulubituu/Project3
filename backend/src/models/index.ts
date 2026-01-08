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
import Question, {
  IQuestion,
  IQuestionImage,
  IChoiceOption,
  QuestionType,
  QuestionDifficulty,
} from './Question';
import Exam, { IExam, IExamQuestionRef } from './Exam';
import ExamAttempt, { IExamAttempt, IExamAnswer } from './ExamAttempt';
import ExamTemplate, {
  IExamTemplate,
  IDifficultyRule,
  ITopicRule,
  ITypeRule,
} from './ExamTemplate';
import AiGenerationJob, { IAiGenerationJob, IAiSource, AiInputType, AiJobStatus } from './AiGenerationJob';
import AiPromptTemplate, { IAiPromptTemplate } from './AiPromptTemplate';

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
  Question,
  Exam,
  ExamAttempt,
  ExamTemplate,
  AiGenerationJob,
  AiPromptTemplate,
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
  IQuestion,
  IQuestionImage,
  IChoiceOption,
  QuestionType,
  QuestionDifficulty,
  IExam,
  IExamQuestionRef,
  IExamAttempt,
  IExamAnswer,
  IExamTemplate,
  IDifficultyRule,
  ITopicRule,
  ITypeRule,
  IAiGenerationJob,
  IAiSource,
  AiInputType,
  AiJobStatus,
  IAiPromptTemplate,
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
  Question,
  Exam,
  ExamAttempt,
  ExamTemplate,
  AiGenerationJob,
  AiPromptTemplate,
};

