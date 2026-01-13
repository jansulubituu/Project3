'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ErrorState from '@/components/notifications/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import GroupSelector, { UserGroup } from '@/components/notifications/GroupSelector';
import { api } from '@/lib/api';
import { NotificationType, getNotificationIcon } from '@/lib/notificationUtils';
import { ChevronLeft, Plus, Edit2, Trash2, Filter, X, Search, Save } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  isBatch?: boolean;
  recipientCount?: number;
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    notificationId: string | null;
    message: string;
  }>({
    isOpen: false,
    notificationId: null,
    message: '',
  });
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
    dateFrom: '',
    dateTo: '',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [recipientType, setRecipientType] = useState<'users' | 'groups'>('users');
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
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
  const [selectedNotificationIds, setSelectedNotificationIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkMarkingRead, setBulkMarkingRead] = useState(false);

  // Debounce search term
  const debouncedSearch = useDebounce(filters.search, 500);

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

      if (filters.userId !== 'all') {
        params.userId = filters.userId;
      }

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (filters.dateFrom) {
        params.dateFrom = filters.dateFrom;
      }

      if (filters.dateTo) {
        params.dateTo = filters.dateTo;
      }

      const res = await api.get('/notifications/admin', { params });
      if (res.data.success) {
        setNotifications(res.data.notifications || []);
        setPagination((prev) => res.data.pagination || prev);
      }
    } catch (err: any) {
      console.error('Failed to fetch notifications:', err);
      setError(err.response?.data?.message || 'Không thể tải thông báo. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters.type, filters.isRead, filters.userId, debouncedSearch, filters.dateFrom, filters.dateTo]);

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

  const handleClearFilters = () => {
    setFilters({
      type: 'all',
      isRead: 'all',
      userId: 'all',
      search: '',
      dateFrom: '',
      dateTo: '',
    });
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({
        ...prev,
        currentPage: newPage,
      }));
    }
  };

  const fetchGroups = useCallback(async () => {
    try {
      const response = await api.get('/notifications/groups');
      if (response.data?.success && response.data?.groups) {
        setGroups(response.data.groups);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  }, []);

  const handleCreate = () => {
    setFormData({
      type: 'system',
      title: '',
      message: '',
      link: '',
      userIds: [],
    });
    setSelectedUsers([]);
    setSelectedGroupIds(new Set());
    setRecipientType('users');
    setGroupSearchTerm('');
    setFormErrors({});
    setShowCreateModal(true);
    fetchGroups();
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

  const handleDeleteClick = (notificationId: string) => {
    const notification = notifications.find((n) => n._id === notificationId);
    const message = notification?.isBatch
      ? `Thao tác này sẽ xóa tất cả ${notification.recipientCount || 0} thông báo trong batch.`
      : 'Thao tác này không thể hoàn tác.';

    setConfirmDialog({
      isOpen: true,
      notificationId,
      message,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDialog.notificationId || deletingId) return;

    try {
      setDeletingId(confirmDialog.notificationId);
      const res = await api.delete(`/notifications/${confirmDialog.notificationId}/admin`);
      
      const notification = notifications.find((n) => n._id === confirmDialog.notificationId);
      const deletedCount = res.data?.deletedCount || 1;
      
      toast.success(
        notification?.isBatch
          ? `Đã xóa ${deletedCount} thông báo trong batch`
          : 'Đã xóa thông báo thành công'
      );
      
      await fetchNotifications();
      setError(null);
      setSelectedNotificationIds(new Set()); // Clear selection after delete
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      toast.error(err.response?.data?.message || 'Không thể xóa thông báo. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
      setConfirmDialog({ isOpen: false, notificationId: null, message: '' });
    }
  };

  const handleDeleteCancel = () => {
    setConfirmDialog({ isOpen: false, notificationId: null, message: '' });
  };

  const handleToggleSelect = (notificationId: string) => {
    setSelectedNotificationIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(notificationId)) {
        newSet.delete(notificationId);
      } else {
        newSet.add(notificationId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedNotificationIds.size === notifications.length) {
      setSelectedNotificationIds(new Set());
    } else {
      setSelectedNotificationIds(new Set(notifications.map((n) => n._id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedNotificationIds.size === 0) return;

    const message = `Bạn có chắc chắn muốn xóa ${selectedNotificationIds.size} thông báo đã chọn?`;
    if (!confirm(message)) return;

    try {
      setBulkDeleting(true);
      const deletePromises = Array.from(selectedNotificationIds).map((id) =>
        api.delete(`/notifications/${id}/admin`).catch((err) => {
          console.error(`Failed to delete notification ${id}:`, err);
          return null;
        })
      );

      await Promise.all(deletePromises);
      await fetchNotifications();
      setSelectedNotificationIds(new Set());
      setError(null);
      toast.success(`Đã xóa ${selectedNotificationIds.size} thông báo thành công`);
    } catch (err: any) {
      console.error('Failed to bulk delete notifications:', err);
      toast.error('Không thể xóa một số thông báo. Vui lòng thử lại.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedNotificationIds.size === 0) return;

    try {
      setBulkMarkingRead(true);
      const markPromises = Array.from(selectedNotificationIds).map((id) => {
        const notification = notifications.find((n) => n._id === id);
        if (notification && !notification.isRead) {
          return api.put(`/notifications/${id}/read`).catch((err) => {
            console.error(`Failed to mark notification ${id} as read:`, err);
            return null;
          });
        }
        return Promise.resolve(null);
      });

      await Promise.all(markPromises);
      await fetchNotifications();
      setSelectedNotificationIds(new Set());
      setError(null);
      toast.success(`Đã đánh dấu ${selectedNotificationIds.size} thông báo là đã đọc`);
    } catch (err: any) {
      console.error('Failed to bulk mark as read:', err);
      toast.error('Không thể đánh dấu một số thông báo. Vui lòng thử lại.');
    } finally {
      setBulkMarkingRead(false);
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
    const trimmedTitle = formData.title.trim();
    const trimmedMessage = formData.message.trim();
    const trimmedLink = formData.link.trim();

    if (!trimmedTitle) {
      errors.title = 'Tiêu đề không được để trống';
    } else if (trimmedTitle.length > 200) {
      errors.title = 'Tiêu đề không được vượt quá 200 ký tự';
    }

    if (!trimmedMessage) {
      errors.message = 'Nội dung không được để trống';
    } else if (trimmedMessage.length > 500) {
      errors.message = 'Nội dung không được vượt quá 500 ký tự';
    }

    if (trimmedLink) {
      if (trimmedLink.length > 500) {
        errors.link = 'Link không được vượt quá 500 ký tự';
      } else {
        // Validate URL format
        try {
          new URL(trimmedLink);
        } catch {
          // Also allow relative paths starting with /
          if (!trimmedLink.startsWith('/')) {
            errors.link = 'Link phải là URL hợp lệ hoặc đường dẫn tương đối (bắt đầu với /)';
          }
        }
      }
    }

    if (showCreateModal) {
      if (recipientType === 'users' && selectedUsers.length === 0) {
        errors.userIds = 'Vui lòng chọn ít nhất một người nhận';
      } else if (recipientType === 'groups' && selectedGroupIds.size === 0) {
        errors.groupIds = 'Vui lòng chọn ít nhất một nhóm người dùng';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const userIds = selectedUsers.map((u) => u._id);

      if (showCreateModal) {
        const payload: any = {
          type: formData.type,
          title: trimmedTitle,
          message: trimmedMessage,
          link: trimmedLink || undefined,
        };

        if (recipientType === 'users') {
          payload.userIds = userIds;
        } else if (recipientType === 'groups') {
          payload.groupIds = Array.from(selectedGroupIds);
        }

        const response = await api.post('/notifications', payload);

        toast.success(
          response.data?.notificationCount
            ? `Thông báo đã được gửi thành công đến ${response.data.notificationCount} người dùng!`
            : 'Thông báo đã được tạo thành công!'
        );

        // Reset form
        setFormData({
          type: 'system' as NotificationType,
          title: '',
          message: '',
          link: '',
          userIds: [],
        });
        setSelectedUsers([]);
        setSelectedGroupIds(new Set());
        setRecipientType('users');
        setUserSearchTerm('');
        setGroupSearchTerm('');
        setFormErrors({});
      } else if (showEditModal && editingNotification) {
        // Check if this is a batch notification (should not happen due to UI, but double check)
        if (editingNotification.isBatch) {
          setError('Không thể chỉnh sửa thông báo batch. Vui lòng xóa và tạo mới.');
          return;
        }

        await api.put(`/notifications/${editingNotification._id}`, {
          title: trimmedTitle,
          message: trimmedMessage,
          link: trimmedLink || undefined,
        });

        toast.success('Thông báo đã được cập nhật thành công!');
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingNotification(null);
      await fetchNotifications();
    } catch (err: any) {
      console.error('Failed to submit:', err);

      // Parse backend validation errors
      const backendErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: any) => {
          const field = error.path || error.field || 'general';
          backendErrors[field] = error.message || error.msg || 'Lỗi validation';
        });
      }

      if (Object.keys(backendErrors).length > 0) {
        setFormErrors(backendErrors);
      } else {
        const errorMsg = err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Memoize filtered users to avoid recalculating on every render
  const filteredUsers = useMemo(() => {
    if (!userSearchTerm) return users.slice(0, 10);
    return users.filter(
      (user) =>
        user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [users, userSearchTerm]);

  const selectedTypeLabel = typeOptions.find((opt) => opt.value === filters.type)?.label || 'Tất cả';
  const selectedStatusLabel = statusOptions.find((opt) => opt.value === filters.isRead)?.label || 'Tất cả';

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
            <div className="flex items-center gap-2">
              {selectedNotificationIds.size > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">
                    Đã chọn: {selectedNotificationIds.size} thông báo
                  </span>
                  <button
                    onClick={handleBulkMarkAsRead}
                    disabled={bulkMarkingRead}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bulkMarkingRead ? 'Đang xử lý...' : 'Đánh dấu đã đọc'}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bulkDeleting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                  <button
                    onClick={() => setSelectedNotificationIds(new Set())}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                  >
                    Bỏ chọn
                  </button>
                </div>
              )}
              <button
                onClick={handleCreate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Tạo Thông Báo
              </button>
            </div>
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

            {/* Date Range Filter */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, dateFrom: e.target.value }));
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Từ ngày"
              />
              <span className="text-gray-500">-</span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, dateTo: e.target.value }));
                  setPagination((prev) => ({ ...prev, currentPage: 1 }));
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="Đến ngày"
              />
              {(filters.dateFrom || filters.dateTo) && (
                <button
                  onClick={() => {
                    setFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
                    setPagination((prev) => ({ ...prev, currentPage: 1 }));
                  }}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Xóa
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <ErrorState message={error} onRetry={fetchNotifications} className="mb-4" />
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
          <EmptyState
            type={
              filters.search || filters.type !== 'all' || filters.isRead !== 'all' || filters.userId !== 'all'
                ? 'filter'
                : 'no-data'
            }
            title={
              filters.search || filters.type !== 'all' || filters.isRead !== 'all' || filters.userId !== 'all'
                ? 'Không tìm thấy thông báo nào'
                : 'Chưa có thông báo nào'
            }
            message={
              filters.search || filters.type !== 'all' || filters.isRead !== 'all' || filters.userId !== 'all'
                ? 'Không tìm thấy thông báo nào với bộ lọc hiện tại. Thử điều chỉnh bộ lọc của bạn.'
                : 'Bạn chưa có thông báo nào. Tạo thông báo mới để bắt đầu.'
            }
            action={
              filters.search || filters.type !== 'all' || filters.isRead !== 'all' || filters.userId !== 'all' || filters.dateFrom || filters.dateTo ? (
                <button
                  onClick={handleClearFilters}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              ) : (
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Tạo thông báo đầu tiên
                </button>
              )
            }
          />
        ) : (
          <>
            {/* Bulk selection header */}
            {notifications.length > 0 && (
              <div className="mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedNotificationIds.size === notifications.length && notifications.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {selectedNotificationIds.size === notifications.length
                      ? 'Bỏ chọn tất cả'
                      : `Chọn tất cả (${notifications.length})`}
                  </span>
                </label>
                {selectedNotificationIds.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedNotificationIds.size} thông báo đã chọn
                  </span>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedNotificationIds.has(notification._id)}
                        onChange={() => handleToggleSelect(notification._id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
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
                            {notification.isBatch ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                Gửi đến {notification.recipientCount || 0} người
                              </span>
                            ) : (
                              <span>
                                {notification.user
                                  ? `${notification.user.fullName} (${notification.user.email})`
                                  : 'Unknown User'}
                              </span>
                            )}
                            <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                            {!notification.isRead && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.isBatch && (
                            <button
                              onClick={() => handleEdit(notification)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              aria-label="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(notification._id)}
                            disabled={deletingId === notification._id}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Bulk selection header */}
            {notifications.length > 0 && (
              <div className="mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedNotificationIds.size === notifications.length && notifications.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">
                    {selectedNotificationIds.size === notifications.length
                      ? 'Bỏ chọn tất cả'
                      : `Chọn tất cả (${notifications.length})`}
                  </span>
                </label>
                {selectedNotificationIds.size > 0 && (
                  <span className="text-sm text-gray-600">
                    {selectedNotificationIds.size} thông báo đã chọn
                  </span>
                )}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-200">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
                    !notification.isRead ? 'bg-blue-50' : ''
                  } ${selectedNotificationIds.has(notification._id) ? 'bg-blue-100' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 pt-1">
                      <input
                        type="checkbox"
                        checked={selectedNotificationIds.has(notification._id)}
                        onChange={() => handleToggleSelect(notification._id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
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
                            {notification.isBatch ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded font-medium">
                                Gửi đến {notification.recipientCount || 0} người
                              </span>
                            ) : (
                              <span>
                                {notification.user
                                  ? `${notification.user.fullName} (${notification.user.email})`
                                  : 'Unknown User'}
                              </span>
                            )}
                            <span>{new Date(notification.createdAt).toLocaleString('vi-VN')}</span>
                            {!notification.isRead && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                Chưa đọc
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!notification.isBatch && (
                            <button
                              onClick={() => handleEdit(notification)}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              aria-label="Sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteClick(notification._id)}
                            disabled={deletingId === notification._id}
                            className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Loại người nhận *
                        </label>
                        <div className="flex gap-4 mb-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recipientType"
                              value="users"
                              checked={recipientType === 'users'}
                              onChange={(e) => setRecipientType(e.target.value as 'users' | 'groups')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Người dùng cụ thể</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recipientType"
                              value="groups"
                              checked={recipientType === 'groups'}
                              onChange={(e) => setRecipientType(e.target.value as 'users' | 'groups')}
                              className="w-4 h-4 text-blue-600"
                            />
                            <span className="text-sm text-gray-700">Nhóm người dùng</span>
                          </label>
                        </div>

                        {recipientType === 'users' ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Tìm kiếm người dùng..."
                              value={userSearchTerm}
                              onChange={(e) => setUserSearchTerm(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                              {filteredUsers.map((user) => (
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
                        ) : (
                          <div className="space-y-2">
                            <GroupSelector
                              groups={groups}
                              selectedGroupIds={selectedGroupIds}
                              onToggleGroup={(groupId) => {
                                setSelectedGroupIds((prev) => {
                                  const newSet = new Set(prev);
                                  if (newSet.has(groupId)) {
                                    newSet.delete(groupId);
                                  } else {
                                    newSet.add(groupId);
                                  }
                                  return newSet;
                                });
                              }}
                              onSelectAll={() => {
                                setSelectedGroupIds(new Set(groups.map((g) => g.id)));
                              }}
                              onDeselectAll={() => {
                                setSelectedGroupIds(new Set());
                              }}
                              searchTerm={groupSearchTerm}
                              onSearchChange={setGroupSearchTerm}
                              disabled={submitting}
                            />
                            {formErrors.groupIds && (
                              <p className="text-sm text-red-600">{formErrors.groupIds}</p>
                            )}
                          </div>
                        )}
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

        {/* Delete Confirmation Dialog */}
        {confirmDialog.isOpen && confirmDialog.notificationId && (
          <ConfirmDialog
            isOpen={confirmDialog.isOpen}
            title="Xác nhận xóa"
            message={
              notifications.find((n) => n._id === confirmDialog.notificationId)?.isBatch
                ? `Bạn có chắc chắn muốn xóa thông báo này? Thao tác này sẽ xóa tất cả ${
                    notifications.find((n) => n._id === confirmDialog.notificationId)?.recipientCount || 0
                  } thông báo trong batch.`
                : confirmDialog.message || 'Bạn có chắc chắn muốn xóa thông báo này?'
            }
            confirmText="Xóa"
            cancelText="Hủy"
            onConfirm={handleDeleteConfirm}
            onCancel={handleDeleteCancel}
            variant="danger"
          />
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
