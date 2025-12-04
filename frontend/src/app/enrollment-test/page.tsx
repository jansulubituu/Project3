'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface CourseSummary {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  level?: string;
  thumbnail?: string;
  totalLessons?: number;
  enrollmentCount?: number;
  instructor?: {
    _id: string;
    fullName: string;
    avatar?: string;
  };
}

interface EnrollmentSummary {
  _id: string;
  course: CourseSummary;
  progress: number;
  status: 'active' | 'completed' | 'suspended' | 'expired';
  totalLessons?: number;
  completedLessons?: number;
  enrolledAt?: string;
  lastAccessed?: string;
}

const STATUS_STYLES: Record<EnrollmentSummary['status'], string> = {
  active: 'bg-green-100 text-green-700 ring-green-600/20',
  completed: 'bg-blue-100 text-blue-700 ring-blue-600/20',
  suspended: 'bg-yellow-100 text-yellow-700 ring-yellow-600/20',
  expired: 'bg-red-100 text-red-700 ring-red-600/20',
};

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('vi-VN');
};

const extractErrorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra') => {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: {
        data?: {
          message?: string;
          error?: string;
          errors?: { message?: string }[];
        };
      };
    };

    return (
      axiosError.response?.data?.message ||
      axiosError.response?.data?.error ||
      axiosError.response?.data?.errors?.[0]?.message ||
      fallback
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export default function EnrollmentTestPage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
      <EnrollmentTestContent />
    </ProtectedRoute>
  );
}

function EnrollmentTestContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [courseLoading, setCourseLoading] = useState(true);
  const [courseError, setCourseError] = useState<string | null>(null);

  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [enrollmentLoading, setEnrollmentLoading] = useState(true);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);

  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [enrollMessage, setEnrollMessage] = useState<string | null>(null);
  const [enrollErrorMessage, setEnrollErrorMessage] = useState<string | null>(null);

  const [manualCourseId, setManualCourseId] = useState('');

  useEffect(() => {
    loadCourses();
    loadEnrollments();
  }, []);

  const loadCourses = async () => {
    try {
      setCourseLoading(true);
      setCourseError(null);

      const response = await api.get('/courses', {
        params: {
          limit: 8,
          sort: 'popular',
        },
      });

      if (response.data.success) {
        setCourses(response.data.courses || []);
      } else {
        setCourses([]);
      }
    } catch (error) {
      setCourseError(extractErrorMessage(error, 'Không thể tải danh sách khóa học'));
      setCourses([]);
    } finally {
      setCourseLoading(false);
    }
  };

  const loadEnrollments = async () => {
    try {
      setEnrollmentLoading(true);
      setEnrollmentError(null);

      const response = await api.get('/enrollments/my-courses', {
        params: {
          limit: 20,
        },
      });

      if (response.data.success) {
        setEnrollments(response.data.enrollments || []);
      } else {
        setEnrollments([]);
      }
    } catch (error) {
      setEnrollmentError(extractErrorMessage(error, 'Không thể tải khóa học đã đăng ký'));
      setEnrollments([]);
    } finally {
      setEnrollmentLoading(false);
    }
  };

  const handleEnroll = async (courseId: string) => {
    if (!courseId) return;

    setEnrollMessage(null);
    setEnrollErrorMessage(null);
    setEnrollingId(courseId);

    try {
      const response = await api.post('/enrollments', { course: courseId });
      if (response.data.success) {
        setEnrollMessage('Đăng ký khóa học thành công! 🎉');
        await loadEnrollments();
        setManualCourseId('');
      }
    } catch (error) {
      setEnrollErrorMessage(extractErrorMessage(error, 'Không thể đăng ký khóa học'));
    } finally {
      setEnrollingId(null);
    }
  };

  const availableCourses = useMemo(() => {
    if (!courses.length || !enrollments.length) return courses;
    const enrolledCourseIds = new Set(enrollments.map((enroll) => enroll.course?._id));
    return courses.filter((course) => !enrolledCourseIds.has(course._id));
  }, [courses, enrollments]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-blue-600 font-semibold">Enrollment Sandbox</p>
            <h1 className="text-2xl font-bold text-gray-900">Test đăng ký khóa học</h1>
            <p className="text-gray-600">
              Đăng nhập dưới vai trò học viên để thử tạo enrollment thông qua API mới.
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-500">Đang đăng nhập dưới tài khoản</p>
            <p className="font-semibold text-gray-900">{user?.fullName}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wide">{user?.role}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">1. Chọn khóa học</h2>
              <p className="text-sm text-gray-500">
                Danh sách các khóa học đang được publish. Chọn một khóa để gửi request đăng ký.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadCourses}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Làm mới danh sách
              </button>
              <Link
                href="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Xem trang Courses
              </Link>
            </div>
          </div>

          {courseError && (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {courseError}
            </p>
          )}

          {courseLoading ? (
            <div className="py-12 text-center text-gray-500">Đang tải danh sách khóa học...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCourses.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-500 border border-dashed border-gray-200 rounded-lg">
                  Bạn đã đăng ký tất cả khóa học trong danh sách mẫu. Hãy tạo thêm khóa học mới để thử.
                </div>
              )}
              {availableCourses.map((course) => (
                <div key={course._id} className="border border-gray-100 rounded-lg p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{course.title}</h3>
                      <p className="text-sm text-gray-500 line-clamp-2">{course.shortDescription}</p>
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      {course.level || 'All levels'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span>👨‍🏫 {course.instructor?.fullName || 'Instructor'}</span>
                    {course.totalLessons && <span>📚 {course.totalLessons} bài học</span>}
                    {course.enrollmentCount !== undefined && <span>🎯 {course.enrollmentCount} học viên</span>}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleEnroll(course._id)}
                      disabled={enrollingId === course._id}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {enrollingId === course._id ? 'Đang đăng ký...' : 'Đăng ký khóa học'}
                    </button>
                    <Link
                      href={`/courses/${course.slug}`}
                      className="inline-flex items-center px-3 py-2 text-sm text-indigo-600 hover:text-indigo-700"
                      target="_blank"
                    >
                      Chi tiết
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">2. Hoặc nhập Course ID thủ công</h2>
          <p className="text-sm text-gray-500 mb-4">
            Nếu khóa học cần test không nằm trong danh sách phía trên, hãy lấy ID hoặc slug và điền vào đây.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={manualCourseId}
              onChange={(e) => setManualCourseId(e.target.value)}
              placeholder="Nhập Course ID hoặc slug..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              onClick={() => handleEnroll(manualCourseId.trim())}
              disabled={!manualCourseId.trim() || enrollingId === manualCourseId.trim()}
              className="inline-flex items-center justify-center px-6 py-2 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Gửi request
            </button>
          </div>

          {enrollMessage && (
            <p className="mt-4 rounded-lg border border-green-100 bg-green-50 p-3 text-sm text-green-700">
              {enrollMessage}
            </p>
          )}

          {enrollErrorMessage && (
            <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {enrollErrorMessage}
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                3. Kết quả gọi API (`GET /enrollments/my-courses`)
              </h2>
              <p className="text-sm text-gray-500">
                Danh sách được làm mới tự động mỗi lần bạn đăng ký thành công. Bạn cũng có thể nhấn nút làm mới.
              </p>
            </div>
            <button
              onClick={loadEnrollments}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Làm mới enrollment
            </button>
          </div>

          {enrollmentError && (
            <p className="mb-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {enrollmentError}
            </p>
          )}

          {enrollmentLoading ? (
            <div className="py-10 text-center text-gray-500">Đang tải danh sách enrollment...</div>
          ) : enrollments.length === 0 ? (
            <div className="py-10 text-center text-gray-500 border border-dashed border-gray-200 rounded-lg">
              Bạn chưa đăng ký khóa học nào. Hãy chọn một khóa ở trên để bắt đầu.
            </div>
          ) : (
            <div className="space-y-4">
              {enrollments.map((enrollment) => (
                <div key={enrollment._id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        {enrollment.course?.title || 'Course'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        ID Enrollment: <span className="font-mono text-gray-700">{enrollment._id}</span>
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_STYLES[enrollment.status]}`}
                    >
                      {enrollment.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Tiến độ</p>
                      <p className="text-gray-900 font-semibold">{enrollment.progress || 0}%</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Đăng ký lúc</p>
                      <p className="text-gray-900 font-semibold">{formatDate(enrollment.enrolledAt)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-gray-400">Truy cập gần nhất</p>
                      <p className="text-gray-900 font-semibold">{formatDate(enrollment.lastAccessed)}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="px-2 py-1 rounded bg-gray-100">
                      Course ID: <span className="font-mono text-gray-800">{enrollment.course?._id}</span>
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-100">
                      Lessons: {enrollment.totalLessons ?? enrollment.course?.totalLessons ?? '—'}
                    </span>
                    {enrollment.course?.instructor?.fullName && (
                      <span className="px-2 py-1 rounded bg-gray-100">Instructor: {enrollment.course.instructor.fullName}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}


