'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { BookOpen, Star, ArrowLeft } from 'lucide-react';
import SimpleLineChart from '@/components/shared/SimpleLineChart';

interface InstructorStats {
  monthlyRevenue?: Array<{ month: string; value: number }>;
  monthlyEnrollments?: Array<{ month: string; value: number }>;
}

interface CoursePerformance {
  _id: string;
  title: string;
  thumbnail?: string;
  enrollmentCount: number;
  revenue: number;
  averageRating: number;
  totalReviews: number;
  completionRate: number;
}

function InstructorAnalyticsContent() {
  const { user } = useAuth();
  const [stats, setStats] = useState<InstructorStats | null>(null);
  const [coursePerformance, setCoursePerformance] = useState<CoursePerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        setError(null);

        const [statsRes, performanceRes] = await Promise.all([
          api.get(`/users/${user.id}/stats`),
          api.get('/courses/instructor/performance'),
        ]);

        // Handle stats response
        if (statsRes.data.success && statsRes.data.stats) {
          const backendStats = statsRes.data.stats;
          setStats({
            monthlyRevenue: backendStats.monthlyRevenue || [],
            monthlyEnrollments: backendStats.monthlyEnrollments || [],
          });
        }

        // Handle course performance
        if (performanceRes.data.success && performanceRes.data.courses) {
          setCoursePerformance(performanceRes.data.courses);
        }
      } catch (err: unknown) {
        console.error('Failed to fetch analytics data:', err);
        let errorMessage = 'Không thể tải dữ liệu phân tích';
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

    fetchAnalyticsData();
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
            <div className="h-8 bg-gray-200 rounded w-64 mb-8 animate-pulse"></div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <div key={i} className="bg-white rounded-lg shadow p-6 h-80 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
                  <div className="h-full bg-gray-200 rounded"></div>
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
            <Link
              href="/instructor/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Phân tích & Thống Kê</h1>
            <p className="text-gray-600 mt-2">Thống kê và hiệu suất khóa học của bạn</p>
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

          {/* Charts Section */}
          {stats && (stats.monthlyRevenue || stats.monthlyEnrollments) && (
            <section className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Phân tích xu hướng</h2>
                <p className="text-gray-600 mt-1 text-sm">Thống kê 6 tháng gần nhất</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {stats.monthlyRevenue && stats.monthlyRevenue.length > 0 && (
                  <SimpleLineChart
                    data={stats.monthlyRevenue}
                    title="Doanh thu theo tháng"
                    color="#10b981"
                    valueFormatter={(value) => formatPrice(value)}
                  />
                )}
                {stats.monthlyEnrollments && stats.monthlyEnrollments.length > 0 && (
                  <SimpleLineChart
                    data={stats.monthlyEnrollments}
                    title="Học viên mới theo tháng"
                    color="#3b82f6"
                  />
                )}
              </div>
            </section>
          )}

          {/* Course Performance Table */}
          {coursePerformance.length > 0 && (
            <section className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Hiệu suất khóa học</h2>
                <p className="text-gray-600 mt-1 text-sm">So sánh các khóa học của bạn</p>
              </div>
              <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khóa học
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đăng ký
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Doanh thu
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đánh giá
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hoàn thành
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {coursePerformance.map((course) => (
                        <tr key={course._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {course.thumbnail ? (
                                <div className="relative w-12 h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0 mr-3">
                                  <Image
                                    src={course.thumbnail}
                                    alt={course.title}
                                    fill
                                    className="object-cover"
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-8 bg-gray-200 rounded flex items-center justify-center flex-shrink-0 mr-3">
                                  <BookOpen className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                                {course.title}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{course.enrollmentCount}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{formatPrice(course.revenue)}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              <span className="text-sm text-gray-900">
                                {course.averageRating > 0 ? course.averageRating.toFixed(1) : 'N/A'}
                              </span>
                              {course.totalReviews > 0 && (
                                <span className="text-xs text-gray-500 ml-1">({course.totalReviews})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{course.completionRate}%</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function InstructorAnalytics() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorAnalyticsContent />
    </ProtectedRoute>
  );
}
