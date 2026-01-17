'use client';

import { useState, useEffect, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Image from 'next/image';
import Link from 'next/link';
import CertificateCard from '@/components/certificates/CertificateCard';

interface ExamProgress {
  _id: string;
  exam: {
    _id: string;
    title: string;
    totalPoints: number;
    passingScore: number;
  };
  status: 'not_started' | 'in_progress' | 'passed' | 'failed';
  examBestScore?: number;
  examLatestScore?: number;
  examPassed?: boolean;
  examAttempts?: number;
}

interface Enrollment {
  _id: string;
  progress: number;
  status: string;
  enrolledAt: string;
  completedAt?: string;
  completedLessons: number;
  completedExams?: number;
  requiredExams?: number;
  totalLessons: number;
  totalTimeSpent: number;
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateId?: string;
  certificateIssuedAt?: string;
  course: {
    _id: string;
    title: string;
    slug: string;
    thumbnail: string;
    level: string;
    totalLessons: number;
    publishedLessonCount: number;
    enrollmentCount: number;
    averageRating: number;
    instructor: {
      _id: string;
      fullName: string;
      avatar: string;
      headline?: string;
    };
  };
  completionSnapshot?: {
    totalLessons: number;
    publishedLessons: number;
    completedLessons: number;
  };
}

export default function MyLearningPage() {
  return (
    <ProtectedRoute>
      <MyLearningContent />
    </ProtectedRoute>
  );
}

function MyLearningContent() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [examProgressMap, setExamProgressMap] = useState<Record<string, ExamProgress[]>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [error, setError] = useState('');

  const loadEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      // Backend validation requires limit between 1-50
      const params: { limit?: number; status?: string } = { limit: 50 };
      if (filter !== 'all') {
        params.status = filter;
      }
      
      console.log('Loading enrollments with params:', params);
      const response = await api.get('/enrollments/my-courses', { params });
      console.log('Enrollments API response:', response.data);
      
      if (response.data.success) {
        const enrollmentsData = response.data.enrollments || [];
        console.log('Enrollments data:', enrollmentsData);
        setEnrollments(enrollmentsData);
        
        // Load exam progress for each enrollment
        const progressMap: Record<string, ExamProgress[]> = {};
        for (const enrollment of enrollmentsData) {
          try {
            const progressResponse = await api.get(`/progress/course/${enrollment.course._id}`);
            if (progressResponse.data.success && progressResponse.data.examProgress) {
              progressMap[enrollment._id] = progressResponse.data.examProgress;
            }
          } catch (err) {
            console.error(`Failed to load exam progress for course ${enrollment.course._id}:`, err);
          }
        }
        setExamProgressMap(progressMap);
        
        if (enrollmentsData.length === 0) {
          setError('');
        }
      } else {
        setError(response.data.message || 'Không thể tải danh sách khóa học');
      }
    } catch (err: unknown) {
      console.error('Failed to load enrollments:', err);
      
      // Extract error message
      let errorMessage = 'Không thể tải danh sách khóa học';
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { 
          response?: { 
            data?: { 
              message?: string;
              errors?: Array<{ msg?: string; message?: string }>;
            };
            status?: number;
            statusText?: string;
          };
          message?: string;
        };
        
        console.error('Error details:', {
          message: axiosError?.message,
          response: axiosError?.response?.data,
          status: axiosError?.response?.status,
          statusText: axiosError?.response?.statusText,
        });
        
        const errorData = axiosError?.response?.data;
        if (errorData) {
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.errors && Array.isArray(errorData.errors)) {
            errorMessage = errorData.errors.map((e) => e.msg || e.message || '').filter(Boolean).join(', ');
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        }
      } else if (err && typeof err === 'object' && 'message' in err) {
        const errorWithMessage = err as { message: string };
        errorMessage = errorWithMessage.message;
      }
      
      setError(errorMessage);
      
      // Set empty array on error to show empty state
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  // Listen for storage events to refresh when enrollment happens in another tab/window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'enrollment_updated' || e.key === 'course_enrolled') {
        loadEnrollments();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadEnrollments]);

  // Also listen for custom events (same window)
  useEffect(() => {
    const handleEnrollmentUpdate = () => {
      loadEnrollments();
    };

    window.addEventListener('enrollmentUpdated', handleEnrollmentUpdate);
    return () => window.removeEventListener('enrollmentUpdated', handleEnrollmentUpdate);
  }, [loadEnrollments]);

  const formatTime = (minutes: number) => {
    if (!minutes || minutes === 0) return '0 phút';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải khóa học của bạn...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Học tập của tôi</h1>
          <p className="text-gray-600">Quản lý và tiếp tục các khóa học bạn đã đăng ký</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setFilter('all')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Tất cả ({enrollments.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'active'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Đang học
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                filter === 'completed'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Đã hoàn thành
            </button>
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lỗi khi tải dữ liệu</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={loadEnrollments}
                className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* Enrollments List */}
        {!loading && enrollments.length === 0 && !error && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {filter === 'all' ? 'Chưa có khóa học nào' : `Chưa có khóa học ${filter === 'active' ? 'đang học' : 'đã hoàn thành'}`}
            </h3>
            <p className="text-gray-600 mb-6">
              {filter === 'all'
                ? 'Bắt đầu khám phá các khóa học mới ngay hôm nay!'
                : filter === 'active'
                ? 'Bạn chưa có khóa học nào đang học.'
                : 'Bạn chưa hoàn thành khóa học nào.'}
            </p>
            {filter === 'all' && (
              <Link
                href="/courses"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Khám phá khóa học
              </Link>
            )}
          </div>
        )}
        {enrollments.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment) => (
              <div
                key={enrollment._id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
              >
                {/* Course Thumbnail */}
                <Link href={`/courses/${enrollment.course.slug}`}>
                  <div className="relative aspect-video bg-gray-200">
                    {enrollment.course.thumbnail ? (
                      <Image
                        src={enrollment.course.thumbnail}
                        alt={enrollment.course.title}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                        📚
                      </div>
                    )}
                    {enrollment.status === 'completed' && (
                      <div className="absolute top-2 right-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-500 text-white">
                          ✓ Hoàn thành
                        </span>
                      </div>
                    )}
                  </div>
                </Link>

                {/* Course Info */}
                <div className="p-4">
                  <Link href={`/courses/${enrollment.course.slug}`}>
                    <h3 className="font-semibold text-gray-900 mb-2 hover:text-blue-600 line-clamp-2">
                      {enrollment.course.title}
                    </h3>
                  </Link>

                  {/* Instructor */}
                  <div className="flex items-center space-x-2 mb-3 text-sm text-gray-600">
                    <span>👤 {enrollment.course.instructor.fullName}</span>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Tiến độ</span>
                      <span className="font-medium text-gray-900">
                        {enrollment.progress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          enrollment.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${enrollment.progress}%` }}
                      ></div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                      <div>
                        Bài học: {enrollment.completedLessons}/{enrollment.course.publishedLessonCount || enrollment.course.totalLessons || 0}
                      </div>
                      {enrollment.requiredExams !== undefined && enrollment.requiredExams > 0 && (
                        <div>
                          Bài kiểm tra: {enrollment.completedExams || 0}/{enrollment.requiredExams}
                        </div>
                      )}
                    </div>
                    {enrollment.course.publishedLessonCount < enrollment.course.totalLessons && (
                      <p className="text-xs text-gray-500 mt-1">
                        {enrollment.course.totalLessons - enrollment.course.publishedLessonCount} bài học đang chuẩn bị
                      </p>
                    )}
                  </div>

                  {/* Exam Progress */}
                  {examProgressMap[enrollment._id] && examProgressMap[enrollment._id].length > 0 && (
                    <div className="mb-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900 mb-2">Bài kiểm tra</p>
                      <div className="space-y-2">
                        {examProgressMap[enrollment._id].slice(0, 2).map((examProgress) => {
                          const exam = examProgress.exam;
                          const isPassed = examProgress.examPassed === true;
                          return (
                            <div
                              key={examProgress._id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-gray-700 truncate flex-1 mr-2">
                                {exam.title}
                              </span>
                              <div className="flex items-center space-x-1">
                                {isPassed ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                                    ✓ {examProgress.examBestScore}/{exam.totalPoints}
                                  </span>
                                ) : examProgress.examAttempts && examProgress.examAttempts > 0 ? (
                                  <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
                                    ✗ {examProgress.examBestScore}/{exam.totalPoints}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                    Chưa làm
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        {examProgressMap[enrollment._id].length > 2 && (
                          <p className="text-xs text-gray-500 text-center pt-1">
                            +{examProgressMap[enrollment._id].length - 2} bài kiểm tra khác
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className={`px-2 py-1 rounded ${getLevelColor(enrollment.course.level)}`}>
                      {getLevelLabel(enrollment.course.level)}
                    </span>
                    <span>⏱️ {formatTime(enrollment.totalTimeSpent)}</span>
                  </div>

                  {/* Certificate Card */}
                  {enrollment.status === 'completed' && enrollment.progress >= 100 && (
                    <div className="mb-3">
                      <CertificateCard
                        enrollmentId={enrollment._id}
                        courseTitle={enrollment.course.title}
                        initialCertificateUrl={enrollment.certificateUrl}
                        initialCertificateId={enrollment.certificateId}
                        isCompleted={enrollment.status === 'completed'}
                        progress={enrollment.progress}
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2">
                    <Link
                      href={`/courses/${enrollment.course.slug}`}
                      className="flex-1 text-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      Xem chi tiết
                    </Link>
                    {enrollment.status === 'active' && (
                      <Link
                        href={`/courses/${enrollment.course.slug}/learn`}
                        className="flex-1 text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        Tiếp tục học
                      </Link>
                    )}
                    {enrollment.status === 'completed' && enrollment.certificateIssued && enrollment.certificateId && (
                      <Link
                        href={`/certificates/view/${enrollment._id}`}
                        className="flex-1 text-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Xem chứng chỉ
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

