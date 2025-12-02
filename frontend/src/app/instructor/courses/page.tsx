'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';

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

function InstructorCoursesContent() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  useEffect(() => {
    const fetchCourses = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const params = filter !== 'all' ? { status: filter } : {};
        const response = await api.get(`/users/${user.id}/courses`, { params });
        if (response.data.success && response.data.type === 'courses') {
          setCourses(response.data.courses || []);
        } else {
          setCourses([]);
        }
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [user?.id, filter]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý khóa học</h1>
              <p className="text-gray-600 mt-2">Tạo và quản lý các khóa học của bạn</p>
            </div>
            <Link
              href="/instructor/courses/new"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + Tạo khóa học mới
            </Link>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex space-x-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setFilter('published')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'published'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Đã xuất bản
              </button>
              <button
                onClick={() => setFilter('draft')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === 'draft'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Bản nháp
              </button>
            </div>
          </div>

          {/* Courses Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Đang tải...</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course._id}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Link href={`/instructor/courses/${course._id}`}>
                    <div className="relative h-48 bg-gray-200">
                      {course.thumbnail ? (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">
                          📚
                        </div>
                      )}
                      <div className="absolute top-4 right-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            course.status === 'published'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {course.status === 'published' ? 'Đã xuất bản' : 'Bản nháp'}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="p-6">
                    <Link href={`/instructor/courses/${course._id}`}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 transition-colors">
                        {course.title}
                      </h3>
                    </Link>
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div className="flex items-center space-x-4">
                        <span>👥 {course.enrollmentCount}</span>
                        <span>⭐ {course.averageRating.toFixed(1)}</span>
                      </div>
                      <span className="font-semibold text-blue-600">{formatPrice(course.price)}</span>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        href={`/instructor/courses/${course._id}/edit`}
                        className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm font-medium"
                      >
                        Chỉnh sửa
                      </Link>
                      <Link
                        href={`/courses/${course.slug}`}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm font-medium"
                      >
                        Xem
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function InstructorCourses() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorCoursesContent />
    </ProtectedRoute>
  );
}

