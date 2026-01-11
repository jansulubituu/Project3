'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { NotificationType, getNotificationIcon } from '@/lib/notificationUtils';
import { ChevronLeft, Plus, Edit2, Trash2, Filter, X, Search, Save } from 'lucide-react';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  user?: {
    _id: string;
    fullName: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface User {
  _id: string;
  fullName: string;
  email: string;
  role: string;
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

function AdminNotificationsManageContent() {
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
    userId: 'all',
    search: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showUserFilter, setShowUserFilter] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    type: 'system' as NotificationType,
    title: '',
    message: '',
    link: '',
    userIds: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
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

      if (filters.userId !== 'all') {
        params.userId = filters.userId;
      }

      if (filters.search) {
        params.search = filters.search;
      }

      const res = await api.get('/notifications/admin', { params });
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setPagination(res.data.pagination || pagination);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      alert(err.response?.data?.message || 'Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, filters, pagination.itemsPerPage]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get('/users', {
        params: {
          limit: 1000,
          isActive: 'true',
        },
      });
      if (res.data.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (showCreateModal || showEditModal) {
      fetchUsers();
    }
  }, [showCreateModal, showEditModal, fetchUsers]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowTypeFilter(false);
        setShowStatusFilter(false);
        setShowUserFilter(false);
      }
    };

    if (showTypeFilter || showStatusFilter || showUserFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTypeFilter, showStatusFilter, showUserFilter]);

  const handleFilterChange = (filterType: 'type' | 'isRead' | 'userId', value: string) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPagination((prev) => ({
      ...prev,
      currentPage: 1,
    }));
    setShowTypeFilter(false);
    setShowStatusFilter(false);
    setShowUserFilter(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({
        ...prev,
        currentPage: newPage,
      }));
    }
  };

  const handleCreate = () => {
    setFormData({
      type: 'system',
      title: '',
      message: '',
      link: '',
      userIds: [],
    });
    setSelectedUsers([]);
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEdit = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link || '',
      userIds: notification.user ? [notification.user._id] : [],
    });
    setSelectedUsers(notification.user ? [notification.user] : []);
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}/admin`);
      await fetchNotifications();
      alert('Xóa thông báo thành công');
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      alert(err.response?.data?.message || 'Không thể xóa thông báo. Vui lòng thử lại.');
    }
  };

  const handleUserToggle = (user: User) => {
    setSelectedUsers((prev) => {
      const isSelected = prev.some((u) => u._id === user._id);
      if (isSelected) {
        return prev.filter((u) => u._id !== user._id);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const errors: Record<string, string> = {};
    if (!formData.title.trim()) {
      errors.title = 'Tiêu đề không được để trống';
    } else if (formData.title.length > 200) {
      errors.title = 'Tiêu đề không được vượt quá 200 ký tự';
    }

    if (!formData.message.trim()) {
      errors.message = 'Nội dung không được để trống';
    } else if (formData.message.length > 500) {
      errors.message = 'Nội dung không được vượt quá 500 ký tự';
    }

    if (showCreateModal && selectedUsers.length === 0) {
      errors.userIds = 'Vui lòng chọn ít nhất một người nhận';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const userIds = selectedUsers.map((u) => u._id);

      if (showCreateModal) {
        await api.post('/notifications', {
          userIds,
          type: formData.type,
          title: formData.title.trim(),
          message: formData.message.trim(),
          link: formData.link.trim() || undefined,
        });
        alert('Tạo thông báo thành công');
      } else if (showEditModal && editingNotification) {
        await api.put(`/notifications/${editingNotification._id}`, {
          title: formData.title.trim(),
          message: formData.message.trim(),
          link: formData.link.trim() || undefined,
        });
        alert('Cập nhật thông báo thành công');
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingNotification(null);
      await fetchNotifications();
    } catch (err: any) {
      console.error('Failed to submit:', err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const selectedTypeLabel = typeOptions.find((opt) => opt.value === filters.type)?.label || 'Tất cả';
  const selectedStatusLabel = statusOptions.find((opt) => opt.value === filters.isRead)?.label || 'Tất cả';
  const selectedUser = users.find((u) => u._id === filters.userId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/admin/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Quay lại"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Quản Lý Thông Báo</h1>
            </div>
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Tạo Thông Báo
            </button>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative">
              <button
                onClick={() => {
                  setShowTypeFilter(!showTypeFilter);
                  setShowStatusFilter(false);
                  setShowUserFilter(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {selectedTypeLabel}
                <ChevronLeft
                  className={`w-4 h-4 transition-transform ${showTypeFilter ? 'rotate-90' : ''}`}
                />
              </button>
              {showTypeFilter && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[200px] max-h-60 overflow-y-auto">
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
                  setShowUserFilter(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {selectedStatusLabel}
                <ChevronLeft
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

            <div className="relative flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tiêu đề, nội dung..."
                  value={filters.search}
                  onChange={(e) => {
                    setFilters((prev) => ({ ...prev, search: e.target.value }));
                    setPagination((prev) => ({ ...prev, currentPage: 1 }));
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
        </div>

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
            <p className="text-gray-500">Không có thông báo nào</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 text-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span>
                              {notification.user
                                ? `${notification.user.fullName} (${notification.user.email})`
                                : 'Unknown User'}
                            </span>
                            <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                            {!notification.isRead && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(notification)}
                            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            aria-label="Sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(notification._id)}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            aria-label="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1 || loading}
                  className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
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
                >
                  <span className="hidden sm:inline">Sau</span>
                  <ChevronLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
            )}
          </>
        )}

        {/* Create/Edit Modal */}
        {(showCreateModal || showEditModal) && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {showCreateModal ? 'Tạo Thông Báo' : 'Sửa Thông Báo'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setShowEditModal(false);
                      setEditingNotification(null);
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {showCreateModal && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loại thông báo *
                        </label>
                        <select
                          value={formData.type}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, type: e.target.value as NotificationType }))
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {typeOptions
                            .filter((opt) => opt.value !== 'all')
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Người nhận *
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Tìm kiếm người dùng..."
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                            {filteredUsers.slice(0, 10).map((user) => (
                              <label
                                key={user._id}
                                className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedUsers.some((u) => u._id === user._id)}
                                  onChange={() => handleUserToggle(user)}
                                  className="rounded"
                                />
                                <span className="text-sm">
                                  {user.fullName} ({user.email})
                                </span>
                              </label>
                            ))}
                          </div>
                          {selectedUsers.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Đã chọn: {selectedUsers.length} người dùng
                            </p>
                          )}
                          {formErrors.userIds && (
                            <p className="text-sm text-red-600">{formErrors.userIds}</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tiêu đề * ({formData.title.length}/200)
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, title: e.target.value }));
                        if (formErrors.title) {
                          setFormErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.title;
                            return newErrors;
                          });
                        }
                      }}
                      maxLength={200}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {formErrors.title && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nội dung * ({formData.message.length}/500)
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, message: e.target.value }));
                        if (formErrors.message) {
                          setFormErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.message;
                            return newErrors;
                          });
                        }
                      }}
                      maxLength={500}
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    {formErrors.message && (
                      <p className="text-sm text-red-600 mt-1">{formErrors.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={formData.link}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, link: e.target.value }))
                      }
                      placeholder="/courses/example"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setShowEditModal(false);
                        setEditingNotification(null);
                      }}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      {submitting ? 'Đang xử lý...' : showCreateModal ? 'Tạo' : 'Lưu'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function AdminNotificationsManagePage() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminNotificationsManageContent />
    </ProtectedRoute>
  );
}
