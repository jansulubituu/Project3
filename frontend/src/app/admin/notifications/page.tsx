'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Bell, Send, Users, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

interface User {
  _id: string;
  email: string;
  fullName: string;
  role: 'student' | 'instructor' | 'admin';
}

interface SystemNotificationForm {
  title: string;
  message: string;
  link: string;
  recipientType: 'all' | 'specific';
  userIds: string[];
}

function AdminNotificationsContent() {
  const [formData, setFormData] = useState<SystemNotificationForm>({
    title: '',
    message: '',
    link: '',
    recipientType: 'all',
    userIds: [],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Fetch users when recipientType is 'specific'
  useEffect(() => {
    if (formData.recipientType === 'specific') {
      fetchUsers();
    }
  }, [formData.recipientType]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get('/users', {
        params: {
          limit: 1000,
          isActive: 'true',
        },
      });
      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    setError('');
    setSuccess('');
  };

  const handleRecipientTypeChange = (type: 'all' | 'specific') => {
    setFormData((prev) => ({
      ...prev,
      recipientType: type,
      userIds: type === 'all' ? [] : prev.userIds,
    }));
    if (type === 'specific') {
      setSelectedUsers([]);
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

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Tiêu đề là bắt buộc';
    } else if (formData.title.length > 200) {
      newErrors.title = 'Tiêu đề không được vượt quá 200 ký tự';
    }

    if (!formData.message.trim()) {
      newErrors.message = 'Nội dung là bắt buộc';
    } else if (formData.message.length > 500) {
      newErrors.message = 'Nội dung không được vượt quá 500 ký tự';
    }

    if (formData.recipientType === 'specific' && selectedUsers.length === 0) {
      newErrors.userIds = 'Vui lòng chọn ít nhất một người dùng';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        message: formData.message.trim(),
      };

      if (formData.link.trim()) {
        payload.link = formData.link.trim();
      }

      if (formData.recipientType === 'all') {
        payload.sendToAll = true;
      } else {
        payload.userIds = selectedUsers.map((u) => u._id);
      }

      const response = await api.post('/notifications/system', payload);

      if (response.data.success) {
        setSuccess(
          `Thông báo đã được gửi thành công đến ${response.data.notificationCount} người dùng!`
        );
        // Reset form
        setFormData({
          title: '',
          message: '',
          link: '',
          recipientType: 'all',
          userIds: [],
        });
        setSelectedUsers([]);
        setUserSearchTerm('');
      }
    } catch (err) {
      console.error('Failed to create system notification:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as {
          response?: {
            data?: {
              error?: string;
              message?: string;
            };
          };
        };
        setError(
          axiosError.response?.data?.message ||
            axiosError.response?.data?.error ||
            'Có lỗi xảy ra khi tạo thông báo hệ thống'
        );
      } else {
        setError('Có lỗi xảy ra khi tạo thông báo hệ thống');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const titleCharsLeft = 200 - formData.title.length;
  const messageCharsLeft = 500 - formData.message.length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Tạo Thông Báo Hệ Thống</h1>
          <p className="text-gray-600">
            Gửi thông báo đến tất cả người dùng hoặc người dùng cụ thể
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">{success}</p>
            </div>
            <button
              onClick={() => setSuccess('')}
              className="text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError('')}
              className="text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              maxLength={200}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập tiêu đề thông báo"
            />
            <div className="mt-1 flex justify-between">
              {errors.title && (
                <p className="text-sm text-red-600">{errors.title}</p>
              )}
              <p className={`text-xs ml-auto ${titleCharsLeft < 20 ? 'text-red-600' : 'text-gray-500'}`}>
                {titleCharsLeft} ký tự còn lại
              </p>
            </div>
          </div>

          {/* Message */}
          <div className="mb-6">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
              Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              maxLength={500}
              rows={5}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.message ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nhập nội dung thông báo"
            />
            <div className="mt-1 flex justify-between">
              {errors.message && (
                <p className="text-sm text-red-600">{errors.message}</p>
              )}
              <p className={`text-xs ml-auto ${messageCharsLeft < 50 ? 'text-red-600' : 'text-gray-500'}`}>
                {messageCharsLeft} ký tự còn lại
              </p>
            </div>
          </div>

          {/* Link */}
          <div className="mb-6">
            <label htmlFor="link" className="block text-sm font-medium text-gray-700 mb-2">
              Link (tùy chọn)
            </label>
            <input
              type="text"
              id="link"
              name="link"
              value={formData.link}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="/courses/example hoặc https://example.com"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL để người dùng điều hướng khi click vào thông báo
            </p>
          </div>

          {/* Recipient Type */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Người nhận <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="recipientType"
                  value="all"
                  checked={formData.recipientType === 'all'}
                  onChange={() => handleRecipientTypeChange('all')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Gửi cho tất cả người dùng</p>
                    <p className="text-sm text-gray-500">Tất cả người dùng đang hoạt động sẽ nhận thông báo này</p>
                  </div>
                </div>
              </label>

              <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="recipientType"
                  value="specific"
                  checked={formData.recipientType === 'specific'}
                  onChange={() => handleRecipientTypeChange('specific')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div className="ml-3 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium text-gray-900">Gửi cho người dùng cụ thể</p>
                    <p className="text-sm text-gray-500">Chọn những người dùng sẽ nhận thông báo</p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* User Selection (if specific) */}
          {formData.recipientType === 'specific' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn người dùng <span className="text-red-500">*</span>
              </label>

              {/* Search */}
              <div className="mb-3">
                <input
                  type="text"
                  value={userSearchTerm}
                  onChange={(e) => setUserSearchTerm(e.target.value)}
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Selected Users Count */}
              {selectedUsers.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    Đã chọn: {selectedUsers.length} người dùng
                  </p>
                </div>
              )}

              {/* Error */}
              {errors.userIds && (
                <p className="text-sm text-red-600 mb-3">{errors.userIds}</p>
              )}

              {/* Users List */}
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {loadingUsers ? (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Đang tải danh sách người dùng...</p>
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="text-sm">Không tìm thấy người dùng</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {filteredUsers.map((user) => {
                      const isSelected = selectedUsers.some((u) => u._id === user._id);
                      return (
                        <label
                          key={user._id}
                          className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleUserToggle(user)}
                            className="w-4 h-4 text-blue-600 focus:ring-blue-500 rounded"
                          />
                          <div className="ml-3 flex-1">
                            <p className="text-sm font-medium text-gray-900">{user.fullName}</p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">
                              {user.role}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  title: '',
                  message: '',
                  link: '',
                  recipientType: 'all',
                  userIds: [],
                });
                setSelectedUsers([]);
                setUserSearchTerm('');
                setError('');
                setSuccess('');
                setErrors({});
              }}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Đang gửi...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Gửi Thông Báo</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-900 mb-1">Lưu ý</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Thông báo hệ thống sẽ hiển thị trong NotificationBell của người nhận</li>
                <li>Người dùng có thể xóa hoặc đánh dấu đã đọc thông báo</li>
                <li>Nếu có link, người dùng sẽ được điều hướng khi click vào thông báo</li>
                <li>Thông báo sẽ được lưu trong database và có thể xem lại</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function AdminNotifications() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminNotificationsContent />
    </ProtectedRoute>
  );
}
