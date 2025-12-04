'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { api } from '@/lib/api';

interface AdminCourse {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  enrollmentCount: number;
  averageRating: number;
  price: number;
  createdAt: string;
  instructor?: {
    _id: string;
    fullName: string;
    email: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

function AdminCoursesContent() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const params: Record<string, string | number> = { page, limit: 20 };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (search.trim()) {
          params.search = search.trim();
        }

        const response = await api.get('/courses/admin/list', { params });
        if (response.data.success) {
          setCourses(response.data.courses || []);
          setPagination(response.data.pagination || null);
        } else {
          setCourses([]);
          setPagination(null);
        }
      } catch (error) {
        console.error('Failed to fetch admin courses:', error);
        setCourses([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [page, statusFilter, search]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (date: string) => new Date(date).toLocaleDateString('vi-VN');

  const handleStatusFilterChange = (value: 'all' | 'draft' | 'published' | 'archived') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Quản lý khóa học (Admin)</h1>
              <p className="text-gray-600 mt-1">
                Xem và quản lý tất cả khóa học trên hệ thống, bao gồm trạng thái publish và giảng viên.
              </p>
            </div>
            <Link
              href="/instructor/courses/new"
              className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              + Tạo khóa học mới
            </Link>
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'published', label: 'Đã xuất bản' },
                { key: 'draft', label: 'Bản nháp' },
                { key: 'archived', label: 'Đã lưu trữ' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleStatusFilterChange(item.key as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    statusFilter === item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleSearchSubmit} className="w-full sm:w-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm theo tiêu đề, mô tả, tag..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full sm:w-72 px-4 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  🔍
                </button>
              </div>
            </form>
          </div>

          {/* Courses Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Danh sách khóa học</h2>
              {pagination && (
                <p className="text-sm text-gray-500">
                  Tổng: {pagination.totalItems} khóa học · Trang {pagination.currentPage}/
                  {pagination.totalPages || 1}
                </p>
              )}
            </div>

            {loading ? (
              <div className="py-10 text-center text-gray-500">Đang tải dữ liệu...</div>
            ) : courses.length === 0 ? (
              <div className="py-10 text-center text-gray-500">Không tìm thấy khóa học nào.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Tiêu đề</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Giảng viên</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Trạng thái</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">Giá</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">Học viên</th>
                      <th className="px-4 py-3 text-center font-medium text-gray-500">Rating</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Ngày tạo</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {courses.map((course) => (
                      <tr key={course._id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="max-w-xs">
                            <p className="font-semibold text-gray-900 truncate">{course.title}</p>
                            <p className="text-xs text-gray-500 truncate">{course.slug}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {course.instructor ? (
                            <div className="max-w-xs">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {course.instructor.fullName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{course.instructor.email}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              course.status === 'published'
                                ? 'bg-green-100 text-green-800'
                                : course.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {course.status === 'published'
                              ? 'Đã xuất bản'
                              : course.status === 'draft'
                              ? 'Bản nháp'
                              : 'Đã lưu trữ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatPrice(course.price)}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-700">{course.enrollmentCount}</td>
                        <td className="px-4 py-3 text-center text-gray-700">
                          {course.averageRating?.toFixed(1) ?? '0.0'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {course.createdAt ? formatDate(course.createdAt) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right space-x-2">
                          <Link
                            href={`/instructor/courses/${course._id}/edit`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Sửa
                          </Link>
                          <Link
                            href={`/courses/${course.slug}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-blue-600 text-xs font-medium text-blue-600 hover:bg-blue-50"
                            target="_blank"
                          >
                            Xem
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                ← Trang trước
              </button>
              <p>
                Trang {pagination.currentPage} / {pagination.totalPages}
              </p>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                className="px-4 py-2 rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Trang sau →
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdminCoursesPage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminCoursesContent />
    </ProtectedRoute>
  );
}


