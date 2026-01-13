'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { BookOpen, CheckCircle, Users, Star, DollarSign } from 'lucide-react';

interface Course {
  _id: string;
  title: string;
  slug: string;
  thumbnail: string;
  status: string;
  enrollmentCount: number;
  averageRating: number;
  totalReviews: number;
  price: number;
  createdAt: string;
}

interface InstructorStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalStudents: number;
  totalRevenue: number;
  averageRating: number;
}

function InstructorDashboardContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);

        // ✅ Fetch stats from backend endpoint instead of calculating client-side
        const [statsRes, recentCoursesRes] = await Promise.all([
          api.get(`/users/${user.id}/stats`),
          api.get(`/users/${user.id}/courses`, { params: { limit: 6 } }),
        ]);

        // Handle stats response
        if (statsRes.data.success && statsRes.data.stats) {
          const backendStats = statsRes.data.stats;
          setStats({
            totalCourses: backendStats.totalCourses || 0,
            publishedCourses: backendStats.publishedCourses || 0,
            draftCourses: backendStats.draftCourses || 0,
            totalStudents: backendStats.totalStudents || 0, // ✅ From backend (unique students)
            totalRevenue: backendStats.totalRevenue || 0, // ✅ From backend (payments)
            averageRating: backendStats.averageRating || 0, // ✅ From backend (weighted)
          });
        }

        // Handle recent courses
        if (recentCoursesRes.data.success && recentCoursesRes.data.type === 'courses') {
          setCourses(recentCoursesRes.data.courses || []);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch dashboard data:', err);
        let errorMessage = 'Không thể tải dữ liệu dashboard';
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
          errorMessage =
            axiosError?.response?.data?.error ||
            axiosError?.response?.data?.message ||
            errorMessage;
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user?.id]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Skeleton Loaders */}
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              ))}
            </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Giảng viên</h1>
            <p className="text-gray-600 mt-2">Quản lý khóa học và theo dõi hiệu suất</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="w-5 h-5 text-red-600 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="ml-4 text-sm text-red-600 hover:text-red-800 font-medium underline"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Courses */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng khóa học</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCourses}</p>
                    {stats.draftCourses > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{stats.draftCourses} bản nháp</p>
                    )}
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Published Courses */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Đã xuất bản</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.publishedCourses}</p>
                    {stats.totalCourses > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Math.round((stats.publishedCourses / stats.totalCourses) * 100)}% tổng số
                      </p>
                    )}
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Total Students */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng học viên</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalStudents}</p>
                    <p className="text-xs text-gray-500 mt-1">Học viên duy nhất</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <Users className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Average Rating */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Đánh giá TB</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '0.0'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Trung bình có trọng số</p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <Star className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Total Revenue - New Card */}
              {stats.totalRevenue > 0 && (
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Tổng doanh thu</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {formatPrice(stats.totalRevenue)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Từ tất cả khóa học</p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-full">
                      <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/instructor/courses/new"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                + Tạo khóa học mới
              </Link>
              <Link
                href="/instructor/courses"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Quản lý khóa học
              </Link>
              <Link
                href="/instructor/notifications/manage"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Quản Lý Thông Báo
              </Link>
              <Link
                href="/instructor/analytics"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Phân tích & Báo cáo
              </Link>
            </div>
          </div>

          {/* Recent Courses */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Khóa học của tôi</h2>
              <Link
                href="/instructor/courses"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Xem tất cả →
              </Link>
            </div>

            {courses.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có khóa học nào</h3>
                <p className="text-gray-600 mb-6">Bắt đầu tạo khóa học đầu tiên của bạn</p>
                <Link
                  href="/instructor/courses/new"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Tạo khóa học mới
                </Link>
              </div>
            ) : (
              <div className="divide-y">
                {courses.map((course) => (
                  <Link
                    key={course._id}
                    href={`/instructor/courses/${course._id}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative w-24 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                        {course.thumbnail ? (
                          <Image
                            src={course.thumbnail}
                            alt={course.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-2xl">
                            📚
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {course.title}
                          </h3>
                          <span
                            className={`ml-4 px-3 py-1 rounded-full text-xs font-semibold ${
                              course.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : course.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {course.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                          </span>
                        </div>
                        <div className="flex items-center space-x-6 mt-2 text-sm text-gray-600">
                          <span>👥 {course.enrollmentCount} học viên</span>
                          <span>⭐ {course.averageRating.toFixed(1)} ({course.totalReviews})</span>
                          <span>💰 {formatPrice(course.price)}</span>
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function InstructorDashboard() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorDashboardContent />
    </ProtectedRoute>
  );
}

