'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Users, TrendingUp, Clock, CheckCircle, XCircle, Eye, ArrowLeft } from 'lucide-react';
import { isValidImageUrl } from '@/lib/utils';

interface CourseInfo {
  _id: string;
  title: string;
  slug: string;
  totalLessons: number;
}

interface Student {
  _id: string;
  fullName: string;
  email: string;
  avatar?: string;
}

interface Enrollment {
  _id: string;
  student: Student;
  status: 'active' | 'completed' | 'suspended' | 'expired';
  progress: number;
  completedLessons: number;
  totalLessons: number;
  enrolledAt: string;
  lastAccessed?: string;
  totalTimeSpent: number;
  completedAt?: string;
}

function CourseStudentsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!courseId) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [courseRes, enrollmentsRes] = await Promise.allSettled([
        api.get(`/courses/${courseId}`),
        api.get(`/enrollments/course/${courseId}`),
      ]);

      if (courseRes.status === 'fulfilled' && courseRes.value.data?.success) {
        const c = courseRes.value.data.course;
        setCourse({
          _id: c._id,
          title: c.title,
          slug: c.slug,
          totalLessons: c.totalLessons || 0,
        });
      } else {
        setError('Không tìm thấy khóa học hoặc bạn không có quyền truy cập.');
        return;
      }

      if (enrollmentsRes.status === 'fulfilled' && enrollmentsRes.value.data?.success) {
        const data = enrollmentsRes.value.data;
        if (Array.isArray(data.enrollments)) {
          setEnrollments(
            data.enrollments.map((e: {
              _id: string;
              student: Student;
              status: string;
              progress: number;
              completedLessons: string[];
              totalLessons: number;
              enrolledAt: string;
              lastAccessed?: string;
              totalTimeSpent: number;
              completedAt?: string;
            }) => ({
              _id: e._id,
              student: e.student,
              status: e.status as Enrollment['status'],
              progress: e.progress || 0,
              completedLessons: Array.isArray(e.completedLessons) ? e.completedLessons.length : 0,
              totalLessons: e.totalLessons || 0,
              enrolledAt: e.enrolledAt,
              lastAccessed: e.lastAccessed,
              totalTimeSpent: e.totalTimeSpent || 0,
              completedAt: e.completedAt,
            }))
          );
        }
      }
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Không thể tải dữ liệu học viên.');
    } finally {
      setLoading(false);
    }
  };

  const filteredEnrollments = enrollments.filter((enrollment) => {
    const matchesSearch =
      enrollment.student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || enrollment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: enrollments.length,
    active: enrollments.filter((e) => e.status === 'active').length,
    completed: enrollments.filter((e) => e.status === 'completed').length,
    suspended: enrollments.filter((e) => e.status === 'suspended').length,
    averageProgress:
      enrollments.length > 0
        ? Math.round(
            enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length
          )
        : 0,
  };

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  const getStatusBadge = (status: Enrollment['status']) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      completed: 'bg-blue-100 text-blue-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
    };
    const labels = {
      active: 'Đang học',
      completed: 'Đã hoàn thành',
      suspended: 'Tạm dừng',
      expired: 'Hết hạn',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const handleViewDetails = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setShowDetailModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải danh sách học viên...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <div className="text-4xl mb-4">👥</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải dữ liệu</h2>
            <p className="text-gray-600 mb-4">{error || 'Bạn không có quyền hoặc khóa học không tồn tại.'}</p>
            <button
              type="button"
              onClick={() => router.push('/instructor/courses')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Quay lại danh sách khóa học
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/instructor/courses/${courseId}`}
              className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại quản lý khóa học
            </Link>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                  Quản lý học viên
                </h1>
                <p className="text-sm text-gray-600">
                  Khóa học: <span className="font-semibold">{course.title}</span>
                </p>
              </div>
              <Link
                href={`/courses/${course.slug}`}
                target="_blank"
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Xem khóa học
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Tổng học viên</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Đang học</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Đã hoàn thành</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Tạm dừng</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-1">{stats.suspended}</p>
                </div>
                <XCircle className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Tiến độ TB</p>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">{stats.averageProgress}%</p>
                </div>
                <Clock className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang học</option>
                  <option value="completed">Đã hoàn thành</option>
                  <option value="suspended">Tạm dừng</option>
                  <option value="expired">Hết hạn</option>
                </select>
              </div>
            </div>
          </div>

          {/* Students List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách học viên ({filteredEnrollments.length})
              </h2>
            </div>

            {filteredEnrollments.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Không tìm thấy học viên nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Học viên
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tiến độ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thời gian học
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ngày đăng ký
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEnrollments.map((enrollment) => (
                      <tr key={enrollment._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {enrollment.student.avatar && isValidImageUrl(enrollment.student.avatar) ? (
                              <Image
                                src={enrollment.student.avatar}
                                alt={enrollment.student.fullName}
                                width={40}
                                height={40}
                                className="rounded-full"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                {enrollment.student.fullName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {enrollment.student.fullName}
                              </div>
                              <div className="text-xs text-gray-500">{enrollment.student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-700 font-medium">{enrollment.progress}%</span>
                              <span className="text-gray-500">
                                {enrollment.completedLessons}/{enrollment.totalLessons} bài
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${enrollment.progress}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(enrollment.status)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTime(enrollment.totalTimeSpent)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(enrollment.enrolledAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewDetails(enrollment)}
                            className="inline-flex items-center px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Student Detail Modal */}
      {showDetailModal && selectedEnrollment && (
        <StudentDetailModal
          enrollment={selectedEnrollment}
          course={course}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedEnrollment(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

// Student Detail Modal Component
function StudentDetailModal({
  enrollment,
  onClose,
}: {
  enrollment: Enrollment;
  course?: CourseInfo;
  onClose: () => void;
}) {
  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chi tiết học viên</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Student Info */}
          <div className="flex items-start space-x-4">
            {enrollment.student.avatar && isValidImageUrl(enrollment.student.avatar) ? (
              <Image
                src={enrollment.student.avatar}
                alt={enrollment.student.fullName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xl">
                {enrollment.student.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{enrollment.student.fullName}</h3>
              <p className="text-sm text-gray-600">{enrollment.student.email}</p>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="text-sm font-medium text-gray-700">Tiến độ học tập</label>
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium">{enrollment.progress}%</span>
                <span className="text-gray-500">
                  {enrollment.completedLessons}/{enrollment.totalLessons} bài học
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all"
                  style={{ width: `${enrollment.progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Trạng thái</label>
              <p className="mt-1">
                {enrollment.status === 'active' ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Đang học
                  </span>
                ) : enrollment.status === 'completed' ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    Đã hoàn thành
                  </span>
                ) : enrollment.status === 'suspended' ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                    Tạm dừng
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                    Hết hạn
                  </span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Thời gian học</label>
              <p className="mt-1 text-gray-900">{formatTime(enrollment.totalTimeSpent)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ngày đăng ký</label>
              <p className="mt-1 text-gray-900">{formatDate(enrollment.enrolledAt)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Lần truy cập cuối</label>
              <p className="mt-1 text-gray-900">{formatDateTime(enrollment.lastAccessed)}</p>
            </div>
            {enrollment.completedAt && (
              <div>
                <label className="text-sm font-medium text-gray-700">Ngày hoàn thành</label>
                <p className="mt-1 text-gray-900">{formatDate(enrollment.completedAt)}</p>
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

export default function CourseStudentsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <CourseStudentsContent />
    </ProtectedRoute>
  );
}

