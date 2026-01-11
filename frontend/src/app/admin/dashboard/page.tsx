'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { api } from '@/lib/api';

interface AdminStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  publishedCourses: number;
  totalEnrollments: number;
  totalRevenue: number;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        const [usersRes, coursesRes] = await Promise.all([
          api.get('/users', { params: { limit: 1000 } }),
          api.get('/courses', { params: { limit: 1000 } }),
        ]);

        if (usersRes.data.success) {
          const users: RecentUser[] = usersRes.data.users || [];
          const calculatedStats: AdminStats = {
            totalUsers: users.length,
            totalStudents: users.filter((u) => u.role === 'student').length,
            totalInstructors: users.filter((u) => u.role === 'instructor').length,
            totalCourses: 0,
            publishedCourses: 0,
            totalEnrollments: 0, // TODO: Replace with enrollment stats when API ready
            totalRevenue: 0, // TODO: Replace with real revenue from payments
          };

          if (coursesRes.data.success) {
            const courses = coursesRes.data.courses || [];
            calculatedStats.totalCourses = courses.length;
            calculatedStats.publishedCourses = courses.filter(
              (c: { status: string }) => c.status === 'published'
            ).length;
          }

          setStats(calculatedStats);
          setRecentUsers(users.slice(0, 5));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
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
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Quản trị</h1>
            <p className="text-gray-600 mt-2">Quản lý hệ thống và người dùng</p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng người dùng</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
                  </div>
                  <div className="text-4xl">👥</div>
                </div>
                <div className="mt-4 flex space-x-4 text-sm">
                  <span className="text-gray-600">Học viên: {stats.totalStudents}</span>
                  <span className="text-gray-600">GV: {stats.totalInstructors}</span>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng khóa học</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{stats.totalCourses}</p>
                  </div>
                  <div className="text-4xl">📚</div>
                </div>
                <div className="mt-4 text-sm text-gray-600">
                  Đã xuất bản: {stats.publishedCourses}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng đăng ký</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{stats.totalEnrollments}</p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tổng doanh thu</p>
                    <p className="text-3xl font-bold text-yellow-600 mt-2">
                      {formatPrice(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="text-4xl">💰</div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Thao tác nhanh</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link
                href="/admin/users"
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center font-medium"
              >
                Quản lý người dùng
              </Link>
              <Link
                href="/admin/courses"
                className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center font-medium"
              >
                Quản lý khóa học
              </Link>
              <Link
                href="/admin/categories"
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center font-medium"
              >
                Quản lý danh mục
              </Link>
              <Link
                href="/admin/reviews"
                className="px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-center font-medium"
              >
                Quản lý đánh giá
              </Link>
              <Link
                href="/admin/images"
                className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center font-medium"
              >
                Quản lý hình ảnh
              </Link>
              <Link
                href="/admin/landing-page"
                className="px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-center font-medium"
              >
                Cấu hình Landing Page
              </Link>
              <Link
                href="/admin/notifications"
                className="px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-center font-medium"
              >
                Tạo Thông Báo Hệ Thống
              </Link>
              <Link
                href="/admin/notifications/manage"
                className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-center font-medium"
              >
                Quản Lý Thông Báo
              </Link>
              <Link
                href="/admin/analytics"
                className="px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-center font-medium"
              >
                Phân tích & Báo cáo
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Người dùng mới</h2>
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

            {/* System Info */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <h2 className="text-xl font-semibold text-gray-900">Thông tin hệ thống</h2>
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

