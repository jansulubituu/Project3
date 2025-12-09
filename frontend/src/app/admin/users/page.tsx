'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Search, Edit2, Trash2, Eye, UserCheck, UserX, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { isValidImageUrl } from '@/lib/utils';

interface User {
  _id: string;
  email: string;
  fullName: string;
  role: 'student' | 'instructor' | 'admin';
  avatar: string;
  isActive: boolean;
  createdAt: string;
  bio?: string;
  headline?: string;
}

interface UserStats {
  totalCourses?: number;
  totalStudents?: number;
  totalEnrollments?: number;
  totalReviews?: number;
}

function AdminUsersContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 2; // Số items mỗi trang
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roleFilter, activeFilter, searchTerm]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: 10,
      };

      if (roleFilter !== 'all') {
        params.role = roleFilter;
      }

      if (activeFilter !== 'all') {
        params.isActive = activeFilter === 'active' ? 'true' : 'false';
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/users', { params });
      if (response.data.success) {
        setUsers(response.data.users || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalItems(response.data.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserStats = async (userId: string) => {
    try {
      const response = await api.get(`/users/${userId}/stats`);
      if (response.data.success) {
        setUserStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleViewDetails = async (user: User) => {
    setSelectedUser(user);
    setShowDetailModal(true);
    await fetchUserStats(user._id);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleActivate = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn kích hoạt tài khoản của ${user.fullName}?`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      await api.put(`/users/${user._id}/activate`);
      await fetchUsers();
      alert('Kích hoạt tài khoản thành công');
    } catch (error) {
      console.error('Failed to activate user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt tài khoản');
      } else {
        alert('Có lỗi xảy ra khi kích hoạt tài khoản');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeactivate = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa tài khoản của ${user.fullName}?`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      await api.put(`/users/${user._id}/deactivate`);
      await fetchUsers();
      alert('Vô hiệu hóa tài khoản thành công');
    } catch (error) {
      console.error('Failed to deactivate user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Có lỗi xảy ra khi vô hiệu hóa tài khoản');
      } else {
        alert('Có lỗi xảy ra khi vô hiệu hóa tài khoản');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa tài khoản của ${user.fullName}?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      setActionLoading(user._id);
      await api.delete(`/users/${user._id}`);
      await fetchUsers();
      alert('Xóa tài khoản thành công');
    } catch (error) {
      console.error('Failed to delete user:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
        alert(axiosError.response?.data?.error || axiosError.response?.data?.message || 'Có lỗi xảy ra khi xóa tài khoản');
      } else {
        alert('Có lỗi xảy ra khi xóa tài khoản');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'instructor':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Quản trị viên';
      case 'instructor':
        return 'Giảng viên';
      case 'student':
        return 'Học viên';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý người dùng</h1>
                <p className="text-gray-600 mt-2">Quản lý tất cả người dùng trong hệ thống</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Tạo người dùng mới</span>
                </button>
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Quay lại Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên hoặc email..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Role Filter */}
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => {
                    setRoleFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="student">Học viên</option>
                  <option value="instructor">Giảng viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>

              {/* Active Filter */}
              <div>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã vô hiệu hóa</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách người dùng ({totalItems})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>Không tìm thấy người dùng nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Người dùng
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Vai trò
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Trạng thái
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ngày tạo
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Thao tác
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((user) => (
                        <tr key={user._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {user.avatar && isValidImageUrl(user.avatar) ? (
                                <Image
                                  src={user.avatar}
                                  alt={user.fullName}
                                  width={40}
                                  height={40}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                  {user.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                                {user.headline && (
                                  <div className="text-sm text-gray-500">{user.headline}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${getRoleColor(
                                user.role
                              )}`}
                            >
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.isActive ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Đang hoạt động
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                Đã vô hiệu hóa
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleViewDetails(user)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleEdit(user)}
                                className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              {user.isActive ? (
                                <button
                                  onClick={() => handleDeactivate(user)}
                                  disabled={actionLoading === user._id}
                                  className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Vô hiệu hóa"
                                >
                                  <UserX className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleActivate(user)}
                                  disabled={actionLoading === user._id}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Kích hoạt"
                                >
                                  <UserCheck className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(user)}
                                disabled={actionLoading === user._id}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Xóa"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 border-t">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      {/* Info */}
                      <div className="text-sm text-gray-600">
                        Hiển thị <span className="font-semibold text-gray-900">{(page - 1) * itemsPerPage + 1}</span> -{' '}
                        <span className="font-semibold text-gray-900">
                          {Math.min(page * itemsPerPage, totalItems)}
                        </span>{' '}
                        trong tổng số <span className="font-semibold text-gray-900">{totalItems}</span> người dùng
                      </div>

                      {/* Pagination Controls */}
                      <div className="flex items-center space-x-1">
                        {/* First Page */}
                        <button
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang đầu"
                        >
                          ««
                        </button>

                        {/* Previous Page */}
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang trước"
                        >
                          ‹
                        </button>

                        {/* Page Numbers */}
                        {(() => {
                          const pages: (number | string)[] = [];
                          const maxVisible = 5;
                          
                          // Calculate start and end page
                          let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
                          const endPage = Math.min(totalPages, startPage + maxVisible - 1);

                          // Adjust start page if we're near the end
                          if (endPage - startPage < maxVisible - 1) {
                            startPage = Math.max(1, endPage - maxVisible + 1);
                          }

                          if (startPage > 1) {
                            pages.push(1);
                            if (startPage > 2) {
                              pages.push('...');
                            }
                          }

                          for (let i = startPage; i <= endPage; i++) {
                            pages.push(i);
                          }

                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pages.push('...');
                            }
                            pages.push(totalPages);
                          }

                          return pages.map((pageNum, idx) => {
                            if (pageNum === '...') {
                              return (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="px-3 py-2 text-sm font-medium text-gray-500"
                                >
                                  ...
                                </span>
                              );
                            }

                            const pageNumber = pageNum as number;
                            const isActive = pageNumber === page;

                            return (
                              <button
                                key={pageNumber}
                                onClick={() => setPage(pageNumber)}
                                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                  isActive
                                    ? 'bg-blue-600 text-white border border-blue-600'
                                    : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            );
                          });
                        })()}

                        {/* Next Page */}
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang sau"
                        >
                          ›
                        </button>

                        {/* Last Page */}
                        <button
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          title="Trang cuối"
                        >
                          »»
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      {/* User Detail Modal */}
      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          stats={userStats}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
            setUserStats(null);
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          onClose={() => {
            setShowEditModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedUser(null);
            fetchUsers();
          }}
        />
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => {
            setShowCreateModal(false);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      <Footer />
    </div>
  );
}

// User Detail Modal Component
function UserDetailModal({
  user,
  stats,
  onClose,
}: {
  user: User;
  stats: UserStats | null;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chi tiết người dùng</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="flex items-start space-x-4">
            {user.avatar && isValidImageUrl(user.avatar) ? (
              <Image
                src={user.avatar}
                alt={user.fullName}
                width={80}
                height={80}
                className="rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-2xl">
                {user.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900">{user.fullName}</h3>
              <p className="text-gray-600">{user.email}</p>
              {user.headline && <p className="text-gray-500 mt-1">{user.headline}</p>}
            </div>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.totalCourses !== undefined && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Khóa học</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalCourses}</p>
                </div>
              )}
              {stats.totalStudents !== undefined && (
                <div className="bg-green-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Học viên</p>
                  <p className="text-2xl font-bold text-green-600">{stats.totalStudents}</p>
                </div>
              )}
              {stats.totalEnrollments !== undefined && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Đăng ký</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.totalEnrollments}</p>
                </div>
              )}
              {stats.totalReviews !== undefined && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Đánh giá</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.totalReviews}</p>
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Vai trò:</span>
              <span className="font-semibold text-gray-900">
                {user.role === 'admin' ? 'Quản trị viên' : user.role === 'instructor' ? 'Giảng viên' : 'Học viên'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Trạng thái:</span>
              <span className={`font-semibold ${user.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {user.isActive ? 'Đang hoạt động' : 'Đã vô hiệu hóa'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ngày tạo:</span>
              <span className="font-semibold text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            {user.bio && (
              <div>
                <span className="text-gray-600">Giới thiệu:</span>
                <p className="mt-1 text-gray-900">{user.bio}</p>
              </div>
            )}
          </div>
        </div>
        <div className="p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// Create User Modal Component
function CreateUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student' as 'student' | 'instructor' | 'admin',
    isActive: true,
    bio: '',
    headline: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email là bắt buộc';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Mật khẩu là bắt buộc';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Họ tên là bắt buộc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        email: formData.email.trim(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        role: formData.role,
        isActive: formData.isActive,
      };

      if (formData.bio.trim()) {
        payload.bio = formData.bio.trim();
      }

      if (formData.headline.trim()) {
        payload.headline = formData.headline.trim();
      }

      await api.post('/users', payload);
      alert('Tạo người dùng thành công!');
      onSuccess();
    } catch (err) {
      console.error('Failed to create user:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as {
          response?: {
            data?: {
              error?: string;
              message?: string;
              errors?: Array<{ field: string; message: string }>;
            };
          };
        };
        
        if (axiosError.response?.data?.errors) {
          const fieldErrors: Record<string, string> = {};
          axiosError.response.data.errors.forEach((err) => {
            fieldErrors[err.field] = err.message;
          });
          setErrors(fieldErrors);
        } else {
          setError(
            axiosError.response?.data?.error ||
              axiosError.response?.data?.message ||
              'Có lỗi xảy ra khi tạo người dùng'
          );
        }
      } else {
        setError('Có lỗi xảy ra khi tạo người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Tạo người dùng mới</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="user@example.com"
              required
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.password ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Tối thiểu 6 ký tự"
              required
              minLength={6}
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>

          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Họ tên <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Nguyễn Văn A"
              required
            />
            {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
          </div>

          {/* Role */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Vai trò <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="student">Học viên</option>
              <option value="instructor">Giảng viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          {/* Headline */}
          <div>
            <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề nghề nghiệp
            </label>
            <input
              type="text"
              id="headline"
              name="headline"
              value={formData.headline}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ví dụ: Software Developer"
            />
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              Giới thiệu
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              placeholder="Giới thiệu về người dùng..."
            />
          </div>

          {/* Is Active */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Tài khoản đang hoạt động</span>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo người dùng'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit User Modal Component
function EditUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [role, setRole] = useState(user.role);
  const [isActive, setIsActive] = useState(user.isActive);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      await api.put(`/users/${user._id}`, {
        role,
        isActive,
      });
      onSuccess();
    } catch (err) {
      console.error('Failed to update user:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string; message?: string } } };
        setError(axiosError.response?.data?.error || axiosError.response?.data?.message || 'Có lỗi xảy ra');
      } else {
        setError('Có lỗi xảy ra khi cập nhật người dùng');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chỉnh sửa người dùng</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Vai trò</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'student' | 'instructor' | 'admin')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="student">Học viên</option>
              <option value="instructor">Giảng viên</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Tài khoản đang hoạt động</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminUsersContent />
    </ProtectedRoute>
  );
}

