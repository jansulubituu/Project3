'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import ErrorState from '@/components/notifications/ErrorState';
import { api } from '@/lib/api';
import { NotificationType, getNotificationIcon } from '@/lib/notificationUtils';
import { ChevronLeft, Plus, Edit2, Trash2, Filter, X, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

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

interface Course {
  _id: string;
  title: string;
  slug: string;
}

interface Student {
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

function InstructorNotificationsManageContent() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });
  const [filters, setFilters] = useState({
    type: 'all',
    isRead: 'all',
    courseId: 'all',
    studentId: 'all',
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [admins, setAdmins] = useState<Student[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [selectedAdmins, setSelectedAdmins] = useState<Student[]>([]);
  const [recipientType, setRecipientType] = useState<'students' | 'admin'>('students');
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showCourseFilter, setShowCourseFilter] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [adminSearchTerm, setAdminSearchTerm] = useState('');
  const [selectedCourseForCreate, setSelectedCourseForCreate] = useState<string>('');

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
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    isOpen: boolean;
    notificationId: string | null;
  }>({
    isOpen: false,
    notificationId: null,
  });

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

      if (filters.courseId !== 'all') {
        params.courseId = filters.courseId;
      }

      if (filters.studentId !== 'all') {
        params.studentId = filters.studentId;
      }

      const res = await api.get('/notifications/instructor', { params });
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
  }, [pagination.currentPage, pagination.itemsPerPage, filters.type, filters.isRead, filters.courseId, filters.studentId]);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await api.get('/courses/mine/list');
      if (res.data.success) {
        setCourses(res.data.courses || []);
      }
    } catch (err) {
      console.error('Failed to fetch courses:', err);
    }
  }, []);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await api.get('/users', {
        params: {
          limit: 1000,
          role: 'admin',
        },
      });
      if (res.data.success) {
        setAdmins(res.data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch admins:', err);
    }
  }, []);

  const fetchStudents = useCallback(async (courseId?: string) => {
    if (!courseId) {
      setStudents([]);
      return;
    }

    try {
      const res = await api.get(`/enrollments/course/${courseId}`);
      if (res.data.success) {
        const enrollments = res.data.enrollments || [];
        const studentList = enrollments.map((e: any) => e.student).filter(Boolean);
        setStudents(studentList);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchCourses();
    fetchAdmins();
  }, [fetchNotifications, fetchCourses, fetchAdmins]);

  useEffect(() => {
    if (showCreateModal && selectedCourseForCreate) {
      fetchStudents(selectedCourseForCreate);
    }
  }, [showCreateModal, selectedCourseForCreate, fetchStudents]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.relative')) {
        setShowTypeFilter(false);
        setShowStatusFilter(false);
        setShowCourseFilter(false);
      }
    };

    if (showTypeFilter || showStatusFilter || showCourseFilter) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTypeFilter, showStatusFilter, showCourseFilter]);

  const handleFilterChange = (filterType: 'type' | 'isRead' | 'courseId' | 'studentId', value: string) => {
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
    setShowCourseFilter(false);
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
    setSelectedStudents([]);
    setSelectedAdmins([]);
    setRecipientType('students');
    setSelectedCourseForCreate('');
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
    setFormErrors({});
    setShowEditModal(true);
  };

  const handleDeleteClick = (notificationId: string) => {
    setDeleteConfirmDialog({
      isOpen: true,
      notificationId,
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDialog.notificationId || deletingId) return;

    try {
      setDeletingId(deleteConfirmDialog.notificationId);
      await api.delete(`/notifications/${deleteConfirmDialog.notificationId}/instructor`);
      await fetchNotifications();
      setError(null);
      setSelectedNotificationIds(new Set()); // Clear selection after delete
      toast.success('Đã xóa thông báo thành công');
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      toast.error(err.response?.data?.message || 'Không thể xóa thông báo. Vui lòng thử lại.');
    } finally {
      setDeletingId(null);
      setDeleteConfirmDialog({ isOpen: false, notificationId: null });
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmDialog({ isOpen: false, notificationId: null });
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

  const handleSelectAll = () => {
    if (selectedNotificationIds.size === notifications.length) {
      setSelectedNotificationIds(new Set());
    } else {
      setSelectedNotificationIds(new Set(notifications.map((n) => n._id)));
    }
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

  const handleBulkDelete = async () => {
    if (selectedNotificationIds.size === 0) return;

    const message = `Bạn có chắc chắn muốn xóa ${selectedNotificationIds.size} thông báo đã chọn?`;
    if (!confirm(message)) return;

    try {
      setBulkDeleting(true);
      const deletePromises = Array.from(selectedNotificationIds).map((id) =>
        api.delete(`/notifications/${id}/instructor`).catch((err) => {
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

  const handleStudentToggle = (student: Student) => {
    setSelectedStudents((prev) => {
      const isSelected = prev.some((s) => s._id === student._id);
      if (isSelected) {
        return prev.filter((s) => s._id !== student._id);
      } else {
        return [...prev, student];
      }
    });
  };

  const handleAdminToggle = (admin: Student) => {
    setSelectedAdmins((prev) => {
      const isSelected = prev.some((a) => a._id === admin._id);
      if (isSelected) {
        return prev.filter((a) => a._id !== admin._id);
      } else {
        return [...prev, admin];
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
      if (recipientType === 'students') {
        if (!selectedCourseForCreate) {
          errors.courseId = 'Vui lòng chọn khóa học';
        } else if (selectedStudents.length === 0) {
          errors.userIds = 'Vui lòng chọn ít nhất một học viên';
        }
      } else if (recipientType === 'admin') {
        if (selectedAdmins.length === 0) {
          errors.userIds = 'Vui lòng chọn ít nhất một admin';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const userIds = recipientType === 'admin' 
        ? selectedAdmins.map((a) => a._id)
        : selectedStudents.map((s) => s._id);

      if (showCreateModal) {
        const response = await api.post('/notifications', {
          userIds,
          type: formData.type,
          title: trimmedTitle,
          message: trimmedMessage,
          link: trimmedLink || undefined,
          recipientType: recipientType,
        });

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
        setSelectedStudents([]);
        setSelectedAdmins([]);
        setRecipientType('students');
        setSelectedCourseForCreate('');
        setStudentSearchTerm('');
        setAdminSearchTerm('');
        setFormErrors({});
      } else if (showEditModal && editingNotification) {
        await api.put(`/notifications/${editingNotification._id}`, {
          title: trimmedTitle,
          message: trimmedMessage,
          link: trimmedLink || undefined,
        });

        const successMessage = 'Thông báo đã được cập nhật thành công!';
        toast.success(successMessage);
      }

      setShowCreateModal(false);
      setShowEditModal(false);
      setEditingNotification(null);
      await fetchNotifications();

      // Success message is shown via toast
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

  // Memoize filtered students and admins
  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm) return students.slice(0, 10);
    return students.filter(
      (student) =>
        student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [students, studentSearchTerm]);

  const filteredAdmins = useMemo(() => {
    if (!adminSearchTerm) return admins.slice(0, 10);
    return admins.filter(
      (admin) =>
        admin.fullName.toLowerCase().includes(adminSearchTerm.toLowerCase()) ||
        admin.email.toLowerCase().includes(adminSearchTerm.toLowerCase())
    ).slice(0, 10);
  }, [admins, adminSearchTerm]);

  const selectedTypeLabel = typeOptions.find((opt) => opt.value === filters.type)?.label || 'Tất cả';
  const selectedStatusLabel = statusOptions.find((opt) => opt.value === filters.isRead)?.label || 'Tất cả';
  const selectedCourse = courses.find((c) => c._id === filters.courseId);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link
                href="/instructor/dashboard"
                className="text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Quay lại"
              >
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Quản Lý Thông Báo</h1>
            </div>
            <div className="flex items-center gap-2">
              {selectedNotificationIds.size > 0 && (
                <>
                  <button
                    onClick={handleBulkMarkAsRead}
                    disabled={bulkMarkingRead}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkMarkingRead ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Đánh dấu đã đọc ({selectedNotificationIds.size})
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkDeleting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Đang xóa...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Xóa ({selectedNotificationIds.size})
                      </>
                    )}
                  </button>
                </>
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
                  setShowCourseFilter(false);
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
                  setShowCourseFilter(false);
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

            <div className="relative">
              <button
                onClick={() => {
                  setShowCourseFilter(!showCourseFilter);
                  setShowTypeFilter(false);
                  setShowStatusFilter(false);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                {selectedCourse ? selectedCourse.title : 'Tất cả khóa học'}
                <ChevronLeft
                  className={`w-4 h-4 transition-transform ${showCourseFilter ? 'rotate-90' : ''}`}
                />
              </button>
              {showCourseFilter && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 min-w-[250px] max-h-60 overflow-y-auto">
                  <button
                    onClick={() => handleFilterChange('courseId', 'all')}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      filters.courseId === 'all' ? 'bg-blue-50 text-blue-700 font-medium' : ''
                    }`}
                  >
                    Tất cả khóa học
                  </button>
                  {courses.map((course) => (
                    <button
                      key={course._id}
                      onClick={() => handleFilterChange('courseId', course._id)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        filters.courseId === course._id ? 'bg-blue-50 text-blue-700 font-medium' : ''
                      }`}
                    >
                      {course.title}
                    </button>
                  ))}
                </div>
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
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có thông báo nào</h3>
              <p className="text-gray-500 mb-4">
                {filters.type !== 'all' || filters.isRead !== 'all' || filters.courseId !== 'all' || filters.studentId !== 'all'
                  ? 'Không tìm thấy thông báo phù hợp với bộ lọc của bạn.'
                  : 'Bạn chưa có thông báo nào từ học viên. Thông báo sẽ xuất hiện khi học viên tương tác với khóa học của bạn.'}
              </p>
              {filters.type === 'all' && filters.isRead === 'all' && filters.courseId === 'all' && filters.studentId === 'all' && (
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Tạo thông báo đầu tiên
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Bulk Actions Bar */}
            {selectedNotificationIds.size > 0 && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
                <p className="text-sm text-blue-700 font-medium">
                  Đã chọn {selectedNotificationIds.size} thông báo
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {selectedNotificationIds.size === notifications.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
                  </button>
                </div>
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

            {/* Pagination - Same as admin page */}
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
                          Gửi cho *
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recipientType"
                              value="students"
                              checked={recipientType === 'students'}
                              onChange={(e) => {
                                setRecipientType(e.target.value as 'students' | 'admin');
                                setSelectedStudents([]);
                                setSelectedAdmins([]);
                                setSelectedCourseForCreate('');
                                if (formErrors.courseId) {
                                  setFormErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.courseId;
                                    return newErrors;
                                  });
                                }
                                if (formErrors.userIds) {
                                  setFormErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.userIds;
                                    return newErrors;
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">Học viên trong khóa học</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="recipientType"
                              value="admin"
                              checked={recipientType === 'admin'}
                              onChange={(e) => {
                                setRecipientType(e.target.value as 'students' | 'admin');
                                setSelectedStudents([]);
                                setSelectedAdmins([]);
                                setSelectedCourseForCreate('');
                                if (formErrors.courseId) {
                                  setFormErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.courseId;
                                    return newErrors;
                                  });
                                }
                                if (formErrors.userIds) {
                                  setFormErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors.userIds;
                                    return newErrors;
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <span className="text-sm">Quản trị viên</span>
                          </label>
                        </div>
                      </div>

                      {recipientType === 'students' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Khóa học *
                          </label>
                        <select
                          value={selectedCourseForCreate}
                          onChange={(e) => {
                            setSelectedCourseForCreate(e.target.value);
                            setSelectedStudents([]);
                            fetchStudents(e.target.value);
                            if (formErrors.courseId) {
                              setFormErrors((prev) => {
                                const newErrors = { ...prev };
                                delete newErrors.courseId;
                                return newErrors;
                              });
                            }
                          }}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Chọn khóa học</option>
                          {courses.map((course) => (
                            <option key={course._id} value={course._id}>
                              {course.title}
                            </option>
                          ))}
                        </select>
                        {formErrors.courseId && (
                          <p className="text-sm text-red-600 mt-1">{formErrors.courseId}</p>
                        )}
                      </div>
                      )}

                      {recipientType === 'admin' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quản trị viên <span className="text-red-500">*</span>
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            Tìm kiếm và chọn ít nhất một quản trị viên để gửi thông báo. Bạn có thể tìm theo tên hoặc email.
                          </p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Tìm kiếm quản trị viên theo tên hoặc email..."
                              value={adminSearchTerm}
                              onChange={(e) => setAdminSearchTerm(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                              {filteredAdmins.length === 0 ? (
                                <p className="px-4 py-2 text-sm text-gray-500">Không tìm thấy quản trị viên nào</p>
                              ) : (
                                filteredAdmins.map((admin) => (
                                  <label
                                    key={admin._id}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedAdmins.some((a) => a._id === admin._id)}
                                      onChange={() => handleAdminToggle(admin)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">
                                      {admin.fullName} ({admin.email})
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {selectedAdmins.length > 0 && (
                              <p className="text-sm text-green-600">
                                ✓ Đã chọn: {selectedAdmins.length} quản trị viên
                              </p>
                            )}
                            {formErrors.userIds && (
                              <p className="text-sm text-red-600">{formErrors.userIds}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Loại thông báo <span className="text-red-500">*</span>
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
                        <p className="mt-1 text-xs text-gray-500">
                          Chọn loại thông báo phù hợp. Loại thông báo giúp học viên phân loại và quản lý thông báo dễ dàng hơn.
                        </p>
                      </div>

                      {recipientType === 'students' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Học viên <span className="text-red-500">*</span>
                          </label>
                          <p className="text-xs text-gray-500 mb-2">
                            Tìm kiếm và chọn ít nhất một học viên để gửi thông báo. Bạn có thể tìm theo tên hoặc email.
                          </p>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Tìm kiếm học viên theo tên hoặc email..."
                              value={studentSearchTerm}
                              onChange={(e) => setStudentSearchTerm(e.target.value)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                              {filteredStudents.length === 0 ? (
                                <p className="px-4 py-2 text-sm text-gray-500">Không tìm thấy học viên nào</p>
                              ) : (
                                filteredStudents.map((student) => (
                                  <label
                                    key={student._id}
                                    className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedStudents.some((s) => s._id === student._id)}
                                      onChange={() => handleStudentToggle(student)}
                                      className="rounded"
                                    />
                                    <span className="text-sm">
                                      {student.fullName} ({student.email})
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {selectedStudents.length > 0 && (
                              <p className="text-sm text-green-600">
                                ✓ Đã chọn: {selectedStudents.length} học viên
                              </p>
                            )}
                            {formErrors.userIds && (
                              <p className="text-sm text-red-600">{formErrors.userIds}</p>
                            )}
                          </div>
                        </div>
                      )}
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
                      Link <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.link}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, link: e.target.value }))
                      }
                      placeholder="/courses/example hoặc https://example.com"
                      maxLength={500}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="mt-1 flex items-center justify-between">
                      <p className="text-xs text-gray-500">
                        Link để học viên có thể truy cập khi click vào thông báo. Có thể là đường dẫn nội bộ (ví dụ: /courses/123) hoặc URL đầy đủ (ví dụ: https://example.com)
                      </p>
                      <span className="text-xs text-gray-400">
                        {formData.link.length}/500
                      </span>
                    </div>
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
        {deleteConfirmDialog.isOpen && deleteConfirmDialog.notificationId && (
          <ConfirmDialog
            isOpen={deleteConfirmDialog.isOpen}
            title="Xác nhận xóa"
            message="Bạn có chắc chắn muốn xóa thông báo này?"
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

export default function InstructorNotificationsManagePage() {
  return (
    <ProtectedRoute allowedRoles={['instructor']}>
      <InstructorNotificationsManageContent />
    </ProtectedRoute>
  );
}
