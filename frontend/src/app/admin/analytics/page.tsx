'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { BookOpen, Star, ArrowLeft } from 'lucide-react';
import SimpleLineChart from '@/components/shared/SimpleLineChart';

interface AnalyticsTrends {
  revenue: Array<{ month: string; value: number }>;
  enrollments: Array<{ month: string; value: number }>;
  users: Array<{ month: string; value: number }>;
}

interface TopCourse {
  _id: string;
  title: string;
  thumbnail?: string;
  enrollmentCount: number;
  revenue: number;
  averageRating: number;
}

function AdminAnalyticsContent() {
  const [analyticsTrends, setAnalyticsTrends] = useState<AnalyticsTrends | null>(null);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [trendsRes, topCoursesRes] = await Promise.all([
          api.get('/admin/analytics/trends'),
          api.get('/admin/analytics/top-courses', { params: { limit: 5, sortBy: 'enrollment' } }),
        ]);

        // Handle analytics trends
        if (trendsRes.data.success && trendsRes.data.data) {
          setAnalyticsTrends(trendsRes.data.data);
        }

        // Handle top courses
        if (topCoursesRes.data.success && topCoursesRes.data.courses) {
          setTopCourses(topCoursesRes.data.courses);
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
  }, []);

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
              {[1, 2, 3].map((i) => (
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
              href="/admin/dashboard"
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">Phân tích & Thống Kê</h1>
            <p className="text-gray-600 mt-2">Thống kê và xu hướng của hệ thống</p>
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
          {analyticsTrends && (
            <section className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Phân tích xu hướng</h2>
                <p className="text-gray-600 mt-1 text-sm">Thống kê 6 tháng gần nhất</p>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <SimpleLineChart
                  data={analyticsTrends.revenue}
                  title="Doanh thu theo tháng"
                  color="#10b981"
                  valueFormatter={(value) => formatPrice(value)}
                />
                <SimpleLineChart
                  data={analyticsTrends.enrollments}
                  title="Số lượng đăng ký theo tháng"
                  color="#3b82f6"
                />
                <SimpleLineChart
                  data={analyticsTrends.users}
                  title="Tăng trưởng người dùng theo tháng"
                  color="#8b5cf6"
                />
              </div>
            </section>
          )}

          {/* Top Courses Section */}
          {topCourses.length > 0 && (
            <section className="mb-12">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Top 5 khóa học</h2>
                <p className="text-gray-600 mt-1 text-sm">Khóa học có nhiều đăng ký nhất</p>
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
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {topCourses.map((course) => (
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
                            </div>
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

export default function AdminAnalytics() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminAnalyticsContent />
    </ProtectedRoute>
  );
}
