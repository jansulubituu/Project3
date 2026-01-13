'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import {
  Users,
  BookOpen,
  Clock,
  UserCheck,
  DollarSign,
  TrendingUp,
  Star,
  FolderTree,
  Star as StarIcon,
  Image as ImageIcon,
  Layout,
  Bell,
  BarChart3,
} from 'lucide-react';

interface AdminStats {
  users: {
    total: number;
    students: number;
    instructors: number;
    admins: number;
  };
  courses: {
    total: number;
    published: number;
    pending: number;
    draft: number;
  };
  enrollments: {
    total: number;
    active: number;
    completed: number;
  };
  revenue: {
    total: number;
    monthly: number;
  };
  ratings: {
    average: number;
    totalReviews: number;
  };
}

interface RecentCourse {
  _id: string;
  title: string;
  thumbnail?: string;
  status: string;
  instructor?: {
    fullName: string;
  };
  createdAt: string;
}

interface RecentUser {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: string;
  isActive: boolean;
}

function AdminDashboardContent() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentCourses, setRecentCourses] = useState<RecentCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // ✅ Fetch stats from backend endpoint instead of calculating client-side
        const [statsRes, usersRes, coursesRes] = await Promise.all([
          api.get('/admin/dashboard/stats'),
          api.get('/users', { params: { limit: 10, sort: 'createdAt:-1' } }),
          api.get('/courses', { params: { limit: 10, sort: 'createdAt:-1' } }),
        ]);

        // Handle stats response
        if (statsRes.data.success && statsRes.data.stats) {
          setStats(statsRes.data.stats);
        }

        // Handle recent users
        if (usersRes.data.success && usersRes.data.users) {
          setRecentUsers(usersRes.data.users.slice(0, 5));
        }

        // Handle recent courses
        if (coursesRes.data.success && coursesRes.data.courses) {
          setRecentCourses(coursesRes.data.courses.slice(0, 5));
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
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'instructor':
        return 'Giảng viên';
      case 'student':
        return 'Học viên';
      default:
        return role;
    }
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
              {[1, 2, 3, 4, 5, 6].map((i) => (
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

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Quản trị</h1>
            <p className="text-gray-600 mt-2">Quản lý hệ thống và người dùng</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
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

          {/* Stats Cards Section */}
          {stats && (
            <section className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Tổng quan</h2>
                <p className="text-gray-600 mt-1 text-sm">Thống kê tổng quan về hệ thống</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Users */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng người dùng</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.users.total}</p>
                    <div className="mt-2 flex space-x-3 text-xs text-gray-500">
                      <span>HV: {stats.users.students}</span>
                      <span>GV: {stats.users.instructors}</span>
                      <span>Admin: {stats.users.admins}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-full">
                    <Users className="w-6 h-6 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Total Courses */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng khóa học</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.courses.total}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      <span className="text-green-600">Đã xuất bản: {stats.courses.published}</span>
                      {stats.courses.pending > 0 && (
                        <span className="ml-2 text-yellow-600">Chờ duyệt: {stats.courses.pending}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-full">
                    <BookOpen className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Total Enrollments */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng đăng ký</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {stats.enrollments.total}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      <span>Đang học: {stats.enrollments.active}</span>
                      <span className="ml-2">Hoàn thành: {stats.enrollments.completed}</span>
                    </div>
                  </div>
                  <div className="p-3 bg-green-100 rounded-full">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Total Revenue */}
              <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {formatPrice(stats.revenue.total)}
                    </p>
                    {stats.revenue.monthly > 0 && (
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <TrendingUp className="w-3 h-3 mr-1 text-green-600" />
                        <span>Tháng này: {formatPrice(stats.revenue.monthly)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-full">
                    <DollarSign className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Average Rating */}
              {stats.ratings.average > 0 && (
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Đánh giá TB</p>
                      <p className="text-3xl font-bold text-purple-600 mt-2">
                        {stats.ratings.average.toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {stats.ratings.totalReviews} đánh giá
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-full">
                      <Star className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Courses */}
              {stats.courses.pending > 0 && (
                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow border-l-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Khóa học chờ duyệt</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {stats.courses.pending}
                      </p>
                      <Link
                        href="/admin/courses?status=pending"
                        className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
                      >
                        Xem chi tiết →
                      </Link>
                    </div>
                    <div className="p-3 bg-yellow-100 rounded-full">
                      <Clock className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>
                </div>
              )}
              </div>
            </section>
          )}

          {/* Quick Actions Section */}
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Thao tác nhanh</h2>
              <p className="text-gray-600 mt-1 text-sm">Các chức năng quản lý chính</p>
            </div>
            
            {/* Quản lý nội dung */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quản lý nội dung
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/users"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        Người dùng
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Quản lý tài khoản</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/courses"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-green-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                      <BookOpen className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                        Khóa học
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Quản lý khóa học</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/categories"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-purple-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <FolderTree className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                        Danh mục
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Phân loại khóa học</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/reviews"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-rose-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-rose-100 rounded-lg group-hover:bg-rose-200 transition-colors">
                      <StarIcon className="w-5 h-5 text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-rose-600 transition-colors">
                        Đánh giá
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Quản lý đánh giá</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Quản lý hệ thống */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Quản lý hệ thống
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/admin/images"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-indigo-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                      <ImageIcon className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                        Hình ảnh
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Quản lý media</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/notifications/manage"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-orange-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                      <Bell className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-orange-600 transition-colors">
                        Thông báo
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Quản lý thông báo</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/analytics"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-yellow-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                      <BarChart3 className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                        Phân tích
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Báo cáo & thống kê</p>
                    </div>
                  </div>
                </Link>

                <Link
                  href="/admin/landing-page"
                  className="group bg-white rounded-lg shadow p-5 hover:shadow-lg transition-all border border-gray-200 hover:border-teal-300"
                >
                  <div className="flex items-start space-x-4">
                    <div className="p-2 bg-teal-100 rounded-lg group-hover:bg-teal-200 transition-colors">
                      <Layout className="w-5 h-5 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                        Landing Page
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">Cấu hình trang chủ</p>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            {/* Tạo mới */}
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Tạo mới
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <Link
                  href="/admin/notifications"
                  className="group bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg shadow p-5 hover:shadow-lg transition-all border-2 border-orange-200 hover:border-orange-300"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-orange-500 rounded-lg group-hover:bg-orange-600 transition-colors">
                      <Bell className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 group-hover:text-orange-700 transition-colors">
                        Tạo Thông Báo Hệ Thống
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">Gửi thông báo đến tất cả người dùng</p>
                    </div>
                    <div className="text-orange-600 group-hover:translate-x-1 transition-transform">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* Recent Activity Section */}
          <section className="mb-12">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Hoạt động gần đây</h2>
              <p className="text-gray-600 mt-1 text-sm">Người dùng và khóa học mới nhất</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Users */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">Người dùng mới</h3>
                <Link
                  href="/admin/users"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Xem tất cả →
                </Link>
              </div>
              <div className="divide-y">
                {recentUsers.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">Chưa có người dùng</div>
                ) : (
                  recentUsers.map((user) => (
                    <div key={user._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${getRoleColor(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Courses */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gray-50 rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">Khóa học mới</h3>
                <Link
                  href="/admin/courses"
                  className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  Xem tất cả →
                </Link>
              </div>
              <div className="divide-y">
                {recentCourses.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">Chưa có khóa học</div>
                ) : (
                  recentCourses.map((course) => (
                    <Link
                      key={course._id}
                      href={`/admin/courses?courseId=${course._id}`}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        {course.thumbnail ? (
                          <div className="relative w-16 h-12 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                            <Image
                              src={course.thumbnail}
                              alt={course.title}
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{course.title}</h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                course.status === 'published'
                                  ? 'bg-green-100 text-green-800'
                                  : course.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {course.status === 'published'
                                ? 'Đã xuất bản'
                                : course.status === 'pending'
                                ? 'Chờ duyệt'
                                : 'Bản nháp'}
                            </span>
                            {course.instructor && (
                              <span className="text-xs text-gray-500">
                                {course.instructor.fullName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-6 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                <h3 className="text-lg font-semibold text-gray-900">Thông tin hệ thống</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Phiên bản</span>
                  <span className="font-semibold text-gray-900">v1.0.0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Trạng thái</span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                    Hoạt động
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Database</span>
                  <span className="font-semibold text-gray-900">MongoDB Atlas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Backend</span>
                  <span className="font-semibold text-gray-900">Express.js</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Frontend</span>
                  <span className="font-semibold text-gray-900">Next.js 14</span>
                </div>
              </div>
            </div>
          </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

