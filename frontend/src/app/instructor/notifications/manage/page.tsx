'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { NotificationType, getNotificationIcon } from '@/lib/notificationUtils';
import { ChevronLeft, Plus, Edit2, Trash2, Filter, X, Save } from 'lucide-react';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Student[]>([]);
  const [showTypeFilter, setShowTypeFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const [showCourseFilter, setShowCourseFilter] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
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

      if (filters.courseId !== 'all') {
        params.courseId = filters.courseId;
      }

      if (filters.studentId !== 'all') {
        params.studentId = filters.studentId;
      }

      const res = await api.get('/notifications/instructor', { params });
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
  }, [fetchNotifications, fetchCourses]);

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

  const handleDelete = async (notificationId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông báo này?')) {
      return;
    }

    try {
      await api.delete(`/notifications/${notificationId}/instructor`);
      await fetchNotifications();
      alert('Xóa thông báo thành công');
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
      alert(err.response?.data?.message || 'Không thể xóa thông báo. Vui lòng thử lại.');
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

    if (showCreateModal) {
      if (!selectedCourseForCreate) {
        errors.courseId = 'Vui lòng chọn khóa học';
      } else if (selectedStudents.length === 0) {
        errors.userIds = 'Vui lòng chọn ít nhất một học viên';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const userIds = selectedStudents.map((s) => s._id);

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

  const filteredStudents = students.filter(
    (student) =>
      student.fullName.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

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
                          Học viên *
                        </label>
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Tìm kiếm học viên..."
                            value={studentSearchTerm}
                            onChange={(e) => setStudentSearchTerm(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <div className="border border-gray-300 rounded-lg max-h-40 overflow-y-auto">
                            {filteredStudents.slice(0, 10).map((student) => (
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
                            ))}
                          </div>
                          {selectedStudents.length > 0 && (
                            <p className="text-sm text-gray-600">
                              Đã chọn: {selectedStudents.length} học viên
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

export default function InstructorNotificationsManagePage() {
  return (
    <ProtectedRoute allowedRoles={['instructor']}>
      <InstructorNotificationsManageContent />
    </ProtectedRoute>
  );
}
