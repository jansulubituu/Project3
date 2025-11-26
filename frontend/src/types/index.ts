// User types
export interface User {
  _id: string;
  email: string;
  fullName: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
  bio?: string;
  headline?: string;
  website?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Course types
export interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  previewVideo?: string;
  price: number;
  discountPrice?: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  language: string;
  requirements: string[];
  learningOutcomes: string[];
  tags: string[];
  status: 'draft' | 'published' | 'archived';
  enrollmentCount: number;
  averageRating: number;
  totalReviews: number;
  totalDuration: number;
  totalLessons: number;
  instructor: User;
  category: Category;
  createdAt: string;
  updatedAt: string;
}

// Category types
export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  courseCount: number;
}

// Section types
export interface Section {
  _id: string;
  course: string;
  title: string;
  description?: string;
  order: number;
  duration: number;
  lessonCount: number;
  lessons?: Lesson[];
}

// Lesson types
export interface Lesson {
  _id: string;
  section: string;
  course: string;
  title: string;
  description?: string;
  type: 'video' | 'article' | 'quiz' | 'assignment';
  videoUrl?: string;
  videoDuration?: number;
  articleContent?: string;
  order: number;
  duration: number;
  isFree: boolean;
}

// Enrollment types
export interface Enrollment {
  _id: string;
  student: string | User;
  course: string | Course;
  progress: number;
  completedLessons: string[];
  status: 'active' | 'completed' | 'suspended';
  enrolledAt: string;
  lastAccessed?: string;
  certificateIssued: boolean;
  certificateUrl?: string;
}

// Review types
export interface Review {
  _id: string;
  course: string | Course;
  student: User;
  rating: number;
  comment: string;
  helpfulCount: number;
  instructorResponse?: string;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  _id: string;
  user: string | User;
  course: string | Course;
  amount: number;
  currency: string;
  paymentMethod: 'stripe' | 'vnpay';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasMore: boolean;
  };
}




