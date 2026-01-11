'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import NotificationItem from '@/components/notifications/NotificationItem';
import { NotificationType } from '@/lib/notificationUtils';
import { ChevronLeft, ChevronRight, CheckCheck, Trash2, Filter, X } from 'lucide-react';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

const typeOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'enrollment', label: 'Đăng ký' },
  { value: 'comment', label: 'Bình luận' },
  { value: 'comment_reply', label: 'Phản hồi' },
  { value: 'review', label: 'Đánh giá' },
  { value: 'instructor_response', label: 'Phản hồi giảng viên' },
  { value: 'certificate', label: 'Chứng chỉ' },
  { value: 'payment', label: 'Thanh toán' },
  { value: 'new_lesson', label: 'Bài học mới' },
  { value: 'system', label: 'Hệ thống' },
];

const statusOptions = [
  { value: 'all', label: 'Tất cả' },
  { value: 'false', label: 'Chưa đọc' },
  { value: 'true', label: 'Đã đọc' },
];

function NotificationsContent() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState({
    type: 'all',
    isRead: 'all',
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [deletingRead, setDeletingRead] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
      };

      if (filters.type !== 'all') {
        params.type = filters.type;
      }

      if (filters.isRead !== 'all') {
        params.isRead = filters.isRead;
      }

      const res = await api.get('/notifications', { params });
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setPagination(res.data.pagination || pagination);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters, pagination.itemsPerPage]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      if (res.data.success) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  const handleFilterChange = (filterType: 'type' | 'isRead', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPagination((prev) => ({
      ...prev,
      currentPage: 1, // Reset to first page when filter changes
    }));
    setShowTypeFilter(false);
    setShowStatusFilter(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowTypeFilter(false);
        setShowStatusFilter(false);
      }
    };

    if (showTypeFilter || showStatusFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTypeFilter, showStatusFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({
        ...prev,
        currentPage: newPage,
      }));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (markingAllRead || unreadCount === 0) return;

    if (!confirm('Bạn có chắc chắn muốn đánh dấu tất cả thông báo đã đọc?')) {
      return;
    }

    try {
      setMarkingAllRead(true);
      await api.put('/notifications/read-all');
      // Update local state
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, isRead: true }))
      );
      setUnreadCount(0);
      // Refetch to ensure consistency
      await fetchNotifications();
    } catch (err: any) {
      console.error('Failed to mark all as read:', err);
      alert(err.response?.data?.message || 'Không thể đánh dấu tất cả đã đọc. Vui lòng thử lại.');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDeleteRead = async () => {
    if (deletingRead) return;

    const readCount = notifications.filter((n) => n.isRead).length;
    if (readCount === 0) return;

    if (!confirm(`Bạn có chắc chắn muốn xóa ${readCount} thông báo đã đọc?`)) {
      return;
    }

    try {
      setDeletingRead(true);
      await api.delete('/notifications/read');
      // Refetch notifications
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err: any) {
      console.error('Failed to delete read notifications:', err);
      alert(err.response?.data?.message || 'Không thể xóa thông báo. Vui lòng thử lại.');
    } finally {
      setDeletingRead(false);
    }
  };

  const handleNotificationUpdate = () => {
    // Refresh notifications and unread count
    fetchNotifications();
    fetchUnreadCount();
  };

  const selectedTypeLabel = typeOptions.find((opt) => opt.value === filters.type)?.label || 'Tất cả';
  const selectedStatusLabel = statusOptions.find((opt) => opt.value === filters.isRead)?.label || 'Tất cả';
  const readCount = notifications.filter((n) => n.isRead).length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/my-learning"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Quay lại"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Thông Báo</h1>
              {unreadCount > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <CheckCheck className="w-4 h-4" />
                  {markingAllRead ? 'Đang xử lý...' : 'Đánh dấu tất cả đã đọc'}
                </button>
              )}
              {readCount > 0 && (
                <button
                  onClick={handleDeleteRead}
                  disabled={deletingRead}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingRead ? 'Đang xóa...' : 'Xóa đã đọc'}
                </button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <button
                onClick={() => {
                  setShowTypeFilter(!showTypeFilter);
                  setShowStatusFilter(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {selectedTypeLabel}
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showTypeFilter ? 'rotate-90' : ''}`}
                />
              </button>
              {showTypeFilter && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                  {typeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('type', option.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        filters.type === option.value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setShowStatusFilter(!showStatusFilter);
                  setShowTypeFilter(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {selectedStatusLabel}
                <ChevronRight
                  className={`w-4 h-4 transition-transform ${showStatusFilter ? 'rotate-90' : ''}`}
                />
              </button>
              {showStatusFilter && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px]">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleFilterChange('isRead', option.value)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        filters.isRead === option.value ? 'bg-blue-50 text-blue-700 font-medium' : ''
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Active filters display */}
            {(filters.type !== 'all' || filters.isRead !== 'all') && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-gray-600">Bộ lọc:</span>
                {filters.type !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                    {selectedTypeLabel}
                    <button
                      onClick={() => handleFilterChange('type', 'all')}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                      aria-label="Xóa bộ lọc"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filters.isRead !== 'all' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                    {selectedStatusLabel}
                    <button
                      onClick={() => handleFilterChange('isRead', 'all')}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                      aria-label="Xóa bộ lọc"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
            <button
              onClick={fetchNotifications}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-4 animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Không có thông báo</h3>
            <p className="text-sm text-gray-500">
              {filters.type !== 'all' || filters.isRead !== 'all'
                ? 'Không có thông báo nào phù hợp với bộ lọc của bạn.'
                : 'Bạn chưa có thông báo nào.'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification._id}
                  notification={notification}
                  onUpdate={handleNotificationUpdate}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Trước</span>
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(pagination.totalPages, 10) }, (_, i) => {
                    let pageNum: number;
                    if (pagination.totalPages <= 10) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage <= 5) {
                      pageNum = i + 1;
                    } else if (pagination.currentPage >= pagination.totalPages - 4) {
                      pageNum = pagination.totalPages - 9 + i;
                    } else {
                      pageNum = pagination.currentPage - 5 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        disabled={loading}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          pagination.currentPage === pageNum
                            ? 'bg-blue-600 text-white font-medium'
                            : 'bg-white border border-gray-300 hover:bg-gray-50'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                        aria-label={`Trang ${pageNum}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages || loading}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  aria-label="Trang sau"
                >
                  <span className="hidden sm:inline">Sau</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Pagination Info */}
            <div className="mt-4 text-center text-sm text-gray-500">
              Hiển thị {notifications.length} / {pagination.totalItems} thông báo
              {pagination.totalPages > 1 && (
                <span className="ml-2">
                  (Trang {pagination.currentPage} / {pagination.totalPages})
                </span>
              )}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <ProtectedRoute>
      <NotificationsContent />
    </ProtectedRoute>
  );
}
