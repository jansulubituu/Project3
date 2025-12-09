'use client';

import { useState, useEffect, Suspense } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import CourseOverview from '@/components/courses/CourseOverview';
import CourseCurriculum from '@/components/courses/CourseCurriculum';
import CourseReviews from '@/components/courses/CourseReviews';
import EnrollmentButton from '@/components/courses/EnrollmentButton';

interface Course {
  _id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  thumbnail: string;
  instructor: {
    _id: string;
    fullName: string;
    avatar: string;
    headline?: string;
    bio?: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  discountPrice?: number;
  level: string;
  averageRating: number;
  totalReviews: number;
  enrollmentCount: number;
  totalDuration?: number;
  totalLessons?: number;
  requirements?: string[];
  learningOutcomes?: string[];
  tags?: string[];
  language?: string;
  createdAt: string;
}

function CourseDetailContent() {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const slug = params?.slug as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews'>('overview');

  useEffect(() => {
    if (slug) {
      fetchCourse();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, isAuthenticated]);

  const fetchCourse = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      }
      const response = await api.get(`/courses/${slug}`);
      if (response.data.success) {
        setCourse(response.data.course);
        setIsEnrolled(response.data.isEnrolled || false);
      } else {
        setError('Không tìm thấy khóa học');
      }
    } catch (err: unknown) {
      console.error('Failed to fetch course:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError('Khóa học không tồn tại');
        } else {
          setError('Có lỗi xảy ra khi tải khóa học');
        }
      } else {
        setError('Có lỗi xảy ra khi tải khóa học');
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleEnrollmentChange = () => {
    // Refresh course data after enrollment
    fetchCourse();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Cơ bản';
      case 'intermediate':
        return 'Trung bình';
      case 'advanced':
        return 'Nâng cao';
      case 'all_levels':
        return 'Mọi cấp độ';
      default:
        return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải khóa học...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy khóa học</h2>
            <p className="text-gray-600 mb-4">{error || 'Khóa học không tồn tại'}</p>
            <Link
              href="/courses"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Quay lại danh sách khóa học
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <div className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
              {/* Thumbnail */}
              <div className="w-full lg:w-1/3 flex-shrink-0">
                <div className="relative aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  {course.thumbnail ? (
                    <Image
                      src={course.thumbnail}
                      alt={course.title}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-6xl">
                      📚
                    </div>
                  )}
                </div>
              </div>

              {/* Course Info */}
              <div className="flex-1">
                <div className="mb-4">
                  <span className="text-sm text-blue-600 font-medium">{course.category.name}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
                  {course.title}
                </h1>
                <p className="text-lg text-gray-600 mb-4">{course.shortDescription}</p>

                {/* Meta Info */}
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <span className="text-yellow-500 mr-1">★</span>
                    <span className="font-semibold">{course.averageRating.toFixed(1)}</span>
                    <span className="ml-1">({course.totalReviews} đánh giá)</span>
                  </div>
                  <div className="flex items-center">
                    <span className="mr-1">👥</span>
                    <span>{course.enrollmentCount} học viên</span>
                  </div>
                  {course.totalLessons && (
                    <div className="flex items-center">
                      <span className="mr-1">📚</span>
                      <span>{course.totalLessons} bài học</span>
                    </div>
                  )}
                  {course.totalDuration && (
                    <div className="flex items-center">
                      <span className="mr-1">⏱️</span>
                      <span>{Math.floor(course.totalDuration / 60)} giờ</span>
                    </div>
                  )}
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getLevelColor(course.level)}`}>
                    {getLevelLabel(course.level)}
                  </span>
                </div>

                {/* Instructor */}
                <div className="flex items-center space-x-3 mb-6">
                  {course.instructor.avatar ? (
                    <Image
                      src={course.instructor.avatar}
                      alt={course.instructor.fullName}
                      width={48}
                      height={48}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                      {course.instructor.fullName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">{course.instructor.fullName}</p>
                    {course.instructor.headline && (
                      <p className="text-sm text-gray-600">{course.instructor.headline}</p>
                    )}
                  </div>
                </div>

                {/* Price & Enrollment */}
                <div className="border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      {course.discountPrice && course.discountPrice < course.price ? (
                        <>
                          <div className="text-3xl font-bold text-blue-600">
                            {formatPrice(course.discountPrice)}
                          </div>
                          <div className="text-lg text-gray-400 line-through">
                            {formatPrice(course.price)}
                          </div>
                        </>
                      ) : (
                        <div className="text-3xl font-bold text-blue-600">
                          {course.price === 0 ? 'Miễn phí' : formatPrice(course.price)}
                        </div>
                      )}
                    </div>
                  </div>
                  <EnrollmentButton
                    courseId={course._id}
                    courseSlug={course.slug}
                    price={course.price}
                    discountPrice={course.discountPrice}
                    isEnrolled={isEnrolled}
                    onEnrollmentChange={handleEnrollmentChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b sticky top-16 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('curriculum')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'curriculum'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Nội dung khóa học
              </button>
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === 'reviews'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Đánh giá ({course.totalReviews})
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'overview' && (
            <CourseOverview course={course} isEnrolled={isEnrolled} />
          )}
          {activeTab === 'curriculum' && (
            <CourseCurriculum courseId={course._id} courseSlug={course.slug} isEnrolled={isEnrolled} />
          )}
          {activeTab === 'reviews' && (
            <CourseReviews
              courseId={course._id}
              isEnrolled={isEnrolled}
              courseInstructorId={course.instructor._id}
              onReviewUpdate={() => fetchCourse(true)} // Silent update - only refresh course data without showing loading
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CourseDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          </main>
          <Footer />
        </div>
      }
    >
      <CourseDetailContent />
    </Suspense>
  );
}

