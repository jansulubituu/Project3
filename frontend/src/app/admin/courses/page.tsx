'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface AdminCourse {
  _id: string;
  title: string;
  slug: string;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  enrollmentCount: number;
  averageRating: number;
  price: number;
  createdAt: string;
  rejectionReason?: string;
  rejectedAt?: string;
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
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'pending' | 'published' | 'rejected' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<AdminCourse | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

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

        const [coursesRes, pendingRes] = await Promise.all([
          api.get('/courses/admin/list', { params }),
          statusFilter === 'all' || statusFilter === 'pending' 
            ? api.get('/courses/admin/list', { params: { status: 'pending', limit: 1 } })
            : Promise.resolve({ data: { success: true, pagination: { totalItems: 0 } } })
        ]);

        if (coursesRes.data.success) {
          setCourses(coursesRes.data.courses || []);
          setPagination(coursesRes.data.pagination || null);
        } else {
          setCourses([]);
          setPagination(null);
        }

        if (pendingRes.data.success && pendingRes.data.pagination) {
          setPendingCount(pendingRes.data.pagination.totalItems || 0);
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

  const handleStatusFilterChange = (value: 'all' | 'draft' | 'pending' | 'published' | 'rejected' | 'archived') => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleApprove = async (courseId: string) => {
    if (!confirm('Bạn có chắc chắn muốn duyệt khóa học này?')) {
      return;
    }

    try {
      setLoadingAction(true);
      const response = await api.put(`/courses/${courseId}/approve`);
      if (response.data.success) {
        toast.success('Đã duyệt khóa học thành công!');
        // Reload courses
        const params: Record<string, string | number> = { page, limit: 20 };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (search.trim()) {
          params.search = search.trim();
        }
        const refreshResponse = await api.get('/courses/admin/list', { params });
        if (refreshResponse.data.success) {
          setCourses(refreshResponse.data.courses || []);
          setPagination(refreshResponse.data.pagination || null);
        }
      }
    } catch (error: any) {
      console.error('Failed to approve course:', error);
      alert(error.response?.data?.message || 'Không thể duyệt khóa học');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectClick = (course: AdminCourse) => {
    setSelectedCourse(course);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedCourse || !rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    if (rejectReason.trim().length < 10) {
      toast.error('Lý do từ chối phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setLoadingAction(true);
      const response = await api.put(`/courses/${selectedCourse._id}/reject`, {
        reason: rejectReason.trim(),
      });
      if (response.data.success) {
        toast.success('Đã từ chối khóa học thành công!');
        setRejectModalOpen(false);
        setSelectedCourse(null);
        setRejectReason('');
        // Reload courses
        const params: Record<string, string | number> = { page, limit: 20 };
        if (statusFilter !== 'all') {
          params.status = statusFilter;
        }
        if (search.trim()) {
          params.search = search.trim();
        }
        const refreshResponse = await api.get('/courses/admin/list', { params });
        if (refreshResponse.data.success) {
          setCourses(refreshResponse.data.courses || []);
          setPagination(refreshResponse.data.pagination || null);
        }
      }
    } catch (error: any) {
      console.error('Failed to reject course:', error);
      alert(error.response?.data?.message || 'Không thể từ chối khóa học');
    } finally {
      setLoadingAction(false);
    }
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
                { key: 'pending', label: 'Chờ duyệt', badge: pendingCount },
                { key: 'published', label: 'Đã xuất bản' },
                { key: 'rejected', label: 'Đã từ chối' },
                { key: 'draft', label: 'Bản nháp' },
                { key: 'archived', label: 'Đã lưu trữ' },
              ].map((item) => (
                <button
                  key={item.key}
                  onClick={() => handleStatusFilterChange(item.key as any)}
                  className={`relative inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    statusFilter === item.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                      statusFilter === item.key
                        ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.badge}
                    </span>
                  )}
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
                                : course.status === 'pending'
                                ? 'bg-blue-100 text-blue-800'
                                : course.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : course.status === 'draft'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {course.status === 'published'
                              ? 'Đã xuất bản'
                              : course.status === 'pending'
                              ? 'Chờ duyệt'
                              : course.status === 'rejected'
                              ? 'Đã từ chối'
                              : course.status === 'draft'
                              ? 'Bản nháp'
                              : 'Đã lưu trữ'}
                          </span>
                          {course.status === 'rejected' && course.rejectionReason && (
                            <div className="mt-1 text-xs text-red-600 max-w-xs truncate" title={course.rejectionReason}>
                              Lý do: {course.rejectionReason}
                            </div>
                          )}
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
                          {course.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(course._id)}
                                disabled={loadingAction}
                                className="inline-flex items-center px-3 py-1.5 rounded-md bg-green-600 text-white text-xs font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Duyệt khóa học"
                              >
                                {loadingAction ? (
                                  <svg className="animate-spin h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : null}
                                Duyệt
                              </button>
                              <button
                                onClick={() => handleRejectClick(course)}
                                disabled={loadingAction}
                                className="inline-flex items-center px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Từ chối khóa học"
                              >
                                Từ chối
                              </button>
                            </>
                          )}
                          <Link
                            href={`/instructor/courses/${course._id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-100"
                          >
                            Quản lý
                          </Link>
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

      {/* Reject Modal */}
      {rejectModalOpen && selectedCourse && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => {
            if (!loadingAction) {
              setRejectModalOpen(false);
              setSelectedCourse(null);
              setRejectReason('');
            }
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Từ chối khóa học</h2>
              <p className="text-sm text-gray-600 mt-1">
                Khóa học: <span className="font-semibold">{selectedCourse.title}</span>
              </p>
            </div>
            <div className="px-6 py-4">
              <label htmlFor="rejectReason" className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:outline-none transition-colors ${
                  rejectReason.length > 0 && rejectReason.trim().length < 10
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-red-500 focus:border-transparent'
                }`}
                placeholder="Nhập lý do từ chối khóa học (tối thiểu 10 ký tự)..."
                disabled={loadingAction}
              />
              <div className="mt-2 flex items-center justify-between">
                <p className={`text-xs ${
                  rejectReason.length > 0 && rejectReason.trim().length < 10
                    ? 'text-red-600'
                    : 'text-gray-500'
                }`}>
                  {rejectReason.length}/500 ký tự
                </p>
                {rejectReason.length > 0 && rejectReason.trim().length < 10 && (
                  <p className="text-xs text-red-600 font-medium">
                    Cần ít nhất {10 - rejectReason.trim().length} ký tự nữa
                  </p>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end space-x-3">
              <button
                onClick={() => {
                  if (!loadingAction) {
                    setRejectModalOpen(false);
                    setSelectedCourse(null);
                    setRejectReason('');
                  }
                }}
                disabled={loadingAction}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleRejectSubmit}
                disabled={loadingAction || !rejectReason.trim() || rejectReason.trim().length < 10}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingAction ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  'Xác nhận từ chối'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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


