'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import { api } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalEnrollments: 0,
    completedCourses: 0,
    totalTimeSpent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'student') {
      loadStats();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadStats = async () => {
    try {
      const response = await api.get('/enrollments/my-courses', {
        params: { limit: 50 },
      });
      if (response.data.success) {
        const enrollments = response.data.enrollments || [];
        const totalTime = enrollments.reduce((sum: number, e: { totalTimeSpent?: number }) => {
          return sum + (e.totalTimeSpent || 0);
        }, 0);
        const completed = enrollments.filter((e: { status: string }) => e.status === 'completed').length;

        setStats({
          totalEnrollments: enrollments.length,
          completedCourses: completed,
          totalTimeSpent: totalTime,
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🎓 EduLearn
              </h1>
              <nav className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                  Khóa học
                </Link>
                <Link href="/my-learning" className="text-gray-700 hover:text-blue-600">
                  Học tập của tôi
                </Link>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.fullName}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                {user?.fullName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={logout}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-8 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Chào mừng trở lại, {user?.fullName}! 👋
          </h2>
          <p className="text-blue-100">
            Sẵn sàng tiếp tục hành trình học tập của bạn chưa?
          </p>
        </div>

        {/* Stats Grid */}
        {user?.role === 'student' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/my-learning"
              className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white text-2xl">
                    📚
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500">Khóa học đã đăng ký</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats.totalEnrollments}
                  </p>
                </div>
                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-green-500 text-white text-2xl">
                    ✅
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Khóa học hoàn thành</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : stats.completedCourses}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-md bg-purple-500 text-white text-2xl">
                    ⏱️
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Thời gian học</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {loading ? '...' : formatTime(stats.totalTimeSpent)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Info Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Thông tin tài khoản
          </h3>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Vai trò</dt>
              <dd className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Trạng thái xác thực</dt>
              <dd className="mt-1">
                {user?.isEmailVerified ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Đã xác thực
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    Chưa xác thực
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{user?.id}</dd>
            </div>
          </dl>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Hành động nhanh
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/courses"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">🔍</div>
              <h4 className="font-semibold text-gray-900 mb-1">Khám phá khóa học</h4>
              <p className="text-sm text-gray-500">Tìm kiếm khóa học phù hợp với bạn</p>
            </Link>

            <Link
              href="/my-learning"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">📖</div>
              <h4 className="font-semibold text-gray-900 mb-1">Tiếp tục học</h4>
              <p className="text-sm text-gray-500">Quay lại khóa học đang học</p>
            </Link>

            <Link
              href="/profile"
              className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
            >
              <div className="text-3xl mb-2">👤</div>
              <h4 className="font-semibold text-gray-900 mb-1">Hồ sơ của tôi</h4>
              <p className="text-sm text-gray-500">Cập nhật thông tin cá nhân</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

