'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import Link from 'next/link';
import CourseValidationChecklist from '@/components/instructor/CourseValidationChecklist';
import CourseStatusBadge from '@/components/instructor/CourseStatusBadge';
import { Clock, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface InstructorCourseDetail {
  _id: string;
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  thumbnail?: string;
  level?: string;
  price: number;
  discountPrice?: number;
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
  enrollmentCount: number;
  averageRating: number;
  totalReviews: number;
  totalLessons?: number;
  totalDuration?: number;
  createdAt: string;
  publishedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
  submittedAt?: string;
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
}

interface EnrollmentSummary {
  _id: string;
  student: {
    _id: string;
    fullName: string;
    email: string;
  };
  status: 'active' | 'completed' | 'suspended' | 'expired';
}

interface ReviewSummary {
  _id: string;
  rating: number;
}

function InstructorCourseDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<InstructorCourseDetail | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentSummary[]>([]);
  const [reviews, setReviews] = useState<ReviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [canSubmit, setCanSubmit] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);

        const [courseRes, enrollmentRes, reviewsRes] = await Promise.allSettled([
          api.get(`/courses/${courseId}`),
          api.get(`/enrollments/course/${courseId}`),
          api.get(`/courses/${courseId}/reviews`, { params: { limit: 5 } }),
        ]);

        if (courseRes.status === 'fulfilled' && courseRes.value.data?.success) {
          const c = courseRes.value.data.course;
          setCourse({
            _id: c._id,
            title: c.title,
            slug: c.slug,
            shortDescription: c.shortDescription,
            description: c.description,
            thumbnail: c.thumbnail,
            level: c.level,
            price: c.price,
            discountPrice: c.discountPrice,
            status: c.status,
            enrollmentCount: c.enrollmentCount,
            averageRating: c.averageRating,
            totalReviews: c.totalReviews,
            totalLessons: c.totalLessons,
            totalDuration: c.totalDuration,
            createdAt: c.createdAt,
            publishedAt: c.publishedAt,
            rejectionReason: c.rejectionReason,
            rejectedAt: c.rejectedAt,
            submittedAt: c.submittedAt,
            category: c.category,
          });
        } else {
          setError('Không tìm thấy khóa học hoặc bạn không có quyền truy cập.');
        }

        if (enrollmentRes.status === 'fulfilled' && enrollmentRes.value.data?.success) {
          const data = enrollmentRes.value.data;
          // Nếu là instructor/admin, API trả về mảng enrollments; nếu là student thì trả về enrollment đơn
          if (Array.isArray(data.enrollments)) {
            setEnrollments(
              data.enrollments.map((e: any) => ({
                _id: e._id,
                student: e.student
                  ? { _id: e.student._id, fullName: e.student.fullName, email: e.student.email }
                  : { _id: '', fullName: 'N/A', email: '' },
                status: e.status,
              }))
            );
          }
        }

        if (reviewsRes.status === 'fulfilled' && reviewsRes.value.data?.success) {
          const data = reviewsRes.value.data;
          if (Array.isArray(data.reviews)) {
            setReviews(
              data.reviews.map((r: any) => ({
                _id: r._id,
                rating: r.rating,
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to load course detail:', err);
        setError('Không thể tải thông tin chi tiết khóa học.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('vi-VN');
  };

  const handleSubmitForApproval = async () => {
    if (!course) return;

    if (!confirm('Bạn có chắc chắn muốn gửi khóa học này để Admin duyệt?')) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await api.post(`/courses/${course._id}/submit`);
      if (response.data.success) {
        toast.success('Đã gửi khóa học để Admin duyệt thành công!');
        // Reload course data
        const courseRes = await api.get(`/courses/${courseId}`);
        if (courseRes.data?.success) {
          const c = courseRes.data.course;
          setCourse({
            _id: c._id,
            title: c.title,
            slug: c.slug,
            shortDescription: c.shortDescription,
            description: c.description,
            thumbnail: c.thumbnail,
            level: c.level,
            price: c.price,
            discountPrice: c.discountPrice,
            status: c.status,
            enrollmentCount: c.enrollmentCount,
            averageRating: c.averageRating,
            totalReviews: c.totalReviews,
            totalLessons: c.totalLessons,
            totalDuration: c.totalDuration,
            createdAt: c.createdAt,
            publishedAt: c.publishedAt,
            rejectionReason: c.rejectionReason,
            rejectedAt: c.rejectedAt,
            submittedAt: c.submittedAt,
            category: c.category,
          });
        }
      }
    } catch (error: any) {
      console.error('Failed to submit course:', error);
      alert(error.response?.data?.message || 'Không thể gửi khóa học để duyệt');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải thông tin khóa học...</p>
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
            <div className="text-4xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể xem khóa học</h2>
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

  const activeEnrollments = enrollments.filter((e) => e.status === 'active').length;
  const completedEnrollments = enrollments.filter((e) => e.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                  Quản lý khóa học: {course.title}
                </h1>
                <div className="flex items-center gap-3 flex-wrap">
                  <CourseStatusBadge status={course.status} />
                  <span className="text-sm text-gray-600">
                    Tạo: {formatDate(course.createdAt)}
                    {course.publishedAt && ` · Publish: ${formatDate(course.publishedAt)}`}
                    {course.submittedAt && ` · Gửi duyệt: ${formatDate(course.submittedAt)}`}
                    {course.rejectedAt && ` · Từ chối: ${formatDate(course.rejectedAt)}`}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(course.status === 'draft' || course.status === 'rejected') && (
                  <button
                    onClick={handleSubmitForApproval}
                    disabled={submitting || !canSubmit}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={!canSubmit && missingRequirements.length > 0 ? `Còn thiếu: ${missingRequirements.join(', ')}` : ''}
                  >
                    {submitting ? 'Đang gửi...' : course.status === 'rejected' ? 'Gửi lại để duyệt' : 'Gửi để Admin duyệt'}
                  </button>
                )}
                <Link
                  href={`/courses/${course.slug}`}
                  target="_blank"
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Xem như học viên
                </Link>
                <Link
                  href={`/instructor/courses/${course._id}/edit`}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  Chỉnh sửa thông tin
                </Link>
              </div>
            </div>

            {/* Rejection Alert */}
            {course.status === 'rejected' && course.rejectionReason && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-900 mb-1">
                      Khóa học đã bị từ chối
                    </h4>
                    <p className="text-sm text-red-700 mb-2">
                      <strong>Lý do:</strong> {course.rejectionReason}
                    </p>
                    {course.rejectedAt && (
                      <p className="text-xs text-red-600">
                        Ngày từ chối: {formatDate(course.rejectedAt)}
                      </p>
                    )}
                    <button
                      onClick={() => router.push(`/instructor/courses/${course._id}/edit`)}
                      className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
                    >
                      Chỉnh sửa và gửi lại
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Pending Info */}
            {course.status === 'pending' && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-yellow-800">
                      Khóa học đang chờ Admin duyệt. Bạn sẽ nhận thông báo khi có kết quả.
                    </p>
                    {course.submittedAt && (
                      <p className="text-xs text-yellow-600 mt-1">
                        Đã gửi: {formatDate(course.submittedAt)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Validation Checklist (if draft) */}
            {course.status === 'draft' && (
              <div className="mb-4 bg-white rounded-lg shadow p-5">
                <h3 className="text-lg font-semibold mb-3">Kiểm tra trước khi gửi</h3>
                <CourseValidationChecklist 
                  course={course}
                  onValidationChange={(isValid, missingItems) => {
                    setCanSubmit(isValid);
                    setMissingRequirements(missingItems);
                  }}
                />
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Số học viên</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{course.enrollmentCount}</p>
              <p className="text-xs text-gray-500 mt-1">
                Đang học: {activeEnrollments} · Hoàn thành: {completedEnrollments}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Đánh giá trung bình</p>
              <p className="text-2xl font-bold text-yellow-600 mt-1">
                {course.averageRating?.toFixed(1) ?? '0.0'} ⭐
              </p>
              <p className="text-xs text-gray-500 mt-1">Tổng {course.totalReviews} lượt đánh giá</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Số bài học</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{course.totalLessons ?? '—'}</p>
              <p className="text-xs text-gray-500 mt-1">
                Thời lượng tổng: {course.totalDuration ? `${course.totalDuration} phút` : '—'}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <p className="text-xs text-gray-500">Giá</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{formatPrice(course.price)}</p>
              {course.discountPrice && course.discountPrice < course.price && (
                <p className="text-xs text-gray-500 mt-1">
                  Giá KM: {formatPrice(course.discountPrice)}{' '}
                  <span className="line-through text-gray-400 ml-1 text-[11px]">
                    {formatPrice(course.price)}
                  </span>
                </p>
              )}
            </div>
          </div>

          {/* Management sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: summary & actions */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-5">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Mô tả khóa học</h2>
                {course.shortDescription && (
                  <p className="text-sm text-gray-700 mb-2">{course.shortDescription}</p>
                )}
                {course.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-line">{course.description}</p>
                )}
              </div>

              <div className="bg-white rounded-lg shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Quản lý nội dung học</h2>
                  <Link
                    href={`/courses/${course.slug}`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Đi tới giao diện học →
                  </Link>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Từ đây bạn có thể quản lý các bài học. Hiện tại bạn có{' '}
                  <span className="font-semibold">{course.totalLessons ?? 0}</span> bài học trong
                  khóa này.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/instructor/courses/${course._id}/edit`}
                    className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Chỉnh sửa thông tin khóa
                  </Link>
                  <Link
                    href={`/instructor/courses/${course._id}/curriculum`}
                    className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
                  >
                    Quản lý nội dung (Curriculum)
                  </Link>
                </div>
              </div>
            </div>

            {/* Right: recent enrollments / reviews */}
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow">
                <div className="px-5 py-3 border-b flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Một số học viên ghi danh</h3>
                  {enrollments.length > 0 && (
                    <Link
                      href={`/instructor/courses/${course._id}/students`}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Xem tất cả →
                    </Link>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y">
                  {enrollments.length === 0 ? (
                    <div className="px-5 py-6 text-sm text-gray-500">
                      Chưa có học viên nào ghi danh.
                    </div>
                  ) : (
                    enrollments.slice(0, 5).map((e) => (
                      <div key={e._id} className="px-5 py-3 text-sm">
                        <p className="font-medium text-gray-900">{e.student.fullName}</p>
                        <p className="text-xs text-gray-500">{e.student.email}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Trạng thái: {e.status === 'active' ? 'Đang học' : e.status}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                {enrollments.length > 0 && (
                  <div className="px-5 py-3 border-t">
                    <Link
                      href={`/instructor/courses/${course._id}/students`}
                      className="block w-full text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                    >
                      Quản lý học viên
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg shadow">
                <div className="px-5 py-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Tổng quan đánh giá (top 5 mới nhất)
                  </h3>
                </div>
                <div className="px-5 py-4">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có đánh giá nào.</p>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-700">
                      {reviews.map((r) => (
                        <div key={r._id} className="flex items-center justify-between">
                          <span>Đánh giá</span>
                          <span className="font-semibold text-yellow-600">{r.rating} ⭐</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function InstructorCourseDetailPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorCourseDetailContent />
    </ProtectedRoute>
  );
}


