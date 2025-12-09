'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Search, Trash2, Eye, Star } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { isValidImageUrl } from '@/lib/utils';

interface Review {
  _id: string;
  course: {
    _id: string;
    title: string;
    thumbnail: string;
    slug: string;
  };
  student: {
    _id: string;
    fullName: string;
    avatar: string;
    email: string;
  };
  rating: number;
  comment: string;
  isPublished: boolean;
  helpfulCount: number;
  createdAt: string;
  instructorResponse?: string;
}

function AdminReviewsContent() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [publishedFilter, setPublishedFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, ratingFilter, publishedFilter]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page === 1) {
        fetchReviews();
      } else {
        setPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page,
        limit: itemsPerPage,
      };

      if (ratingFilter !== 'all') {
        params.rating = ratingFilter;
      }

      if (publishedFilter !== 'all') {
        params.isPublished = publishedFilter === 'published' ? 'true' : 'false';
      }

      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }

      const response = await api.get('/reviews', { params });
      if (response.data.success) {
        setReviews(response.data.reviews || []);
        setTotalPages(response.data.pagination?.totalPages || 1);
        setTotalItems(response.data.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (review: Review) => {
    setSelectedReview(review);
    setShowDetailModal(true);
  };

  const handleDelete = async (review: Review) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa đánh giá này?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      setActionLoading(review._id);
      await api.delete(`/reviews/${review._id}`);
      await fetchReviews();
      alert('Xóa đánh giá thành công');
    } catch (error) {
      console.error('Failed to delete review:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá');
      } else {
        alert('Có lỗi xảy ra khi xóa đánh giá');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
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
                <h1 className="text-3xl font-bold text-gray-900">Quản lý đánh giá</h1>
                <p className="text-gray-600 mt-2">Quản lý tất cả đánh giá khóa học</p>
              </div>
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                ← Quay lại Dashboard
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo nội dung đánh giá..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div>
                <select
                  value={ratingFilter}
                  onChange={(e) => {
                    setRatingFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả đánh giá</option>
                  <option value="5">5 sao</option>
                  <option value="4">4 sao</option>
                  <option value="3">3 sao</option>
                  <option value="2">2 sao</option>
                  <option value="1">1 sao</option>
                </select>
              </div>

              {/* Published Filter */}
              <div>
                <select
                  value={publishedFilter}
                  onChange={(e) => {
                    setPublishedFilter(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="unpublished">Chưa xuất bản</option>
                </select>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách đánh giá ({totalItems})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>Không tìm thấy đánh giá nào</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Khóa học
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Học viên
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Đánh giá
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
                      {reviews.map((review) => (
                        <tr key={review._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {review.course.thumbnail ? (
                                <Image
                                  src={review.course.thumbnail}
                                  alt={review.course.title}
                                  width={40}
                                  height={40}
                                  className="rounded-lg object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-200"></div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900 line-clamp-1">
                                  {review.course.title}
                                </div>
                                <Link
                                  href={`/courses/${review.course.slug}`}
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  Xem khóa học
                                </Link>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {review.student.avatar && isValidImageUrl(review.student.avatar) ? (
                                <Image
                                  src={review.student.avatar}
                                  alt={review.student.fullName}
                                  width={32}
                                  height={32}
                                  className="rounded-full"
                                />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold">
                                  {review.student.fullName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {review.student.fullName}
                                </div>
                                <div className="text-xs text-gray-500">{review.student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {renderStars(review.rating)}
                              <p className="text-sm text-gray-700 line-clamp-2">{review.comment}</p>
                              {review.helpfulCount > 0 && (
                                <p className="text-xs text-gray-500">
                                  {review.helpfulCount} người thấy hữu ích
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {review.isPublished ? (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                                Đã xuất bản
                              </span>
                            ) : (
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                                Chưa xuất bản
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => handleViewDetails(review)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(review)}
                                disabled={actionLoading === review._id}
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
                      <div className="text-sm text-gray-600">
                        Hiển thị <span className="font-semibold text-gray-900">{(page - 1) * itemsPerPage + 1}</span> -{' '}
                        <span className="font-semibold text-gray-900">
                          {Math.min(page * itemsPerPage, totalItems)}
                        </span>{' '}
                        trong tổng số <span className="font-semibold text-gray-900">{totalItems}</span> đánh giá
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPage(1)}
                          disabled={page === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ««
                        </button>
                        <button
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          disabled={page === 1}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ‹
                        </button>
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                pageNum === page
                                  ? 'bg-blue-600 text-white border border-blue-600'
                                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          disabled={page === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          ›
                        </button>
                        <button
                          onClick={() => setPage(totalPages)}
                          disabled={page === totalPages}
                          className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

      {/* Review Detail Modal */}
      {showDetailModal && selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedReview(null);
          }}
        />
      )}

      <Footer />
    </div>
  );
}

// Review Detail Modal
function ReviewDetailModal({ review, onClose }: { review: Review; onClose: () => void }) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chi tiết đánh giá</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>
        <div className="p-6 space-y-6">
          {/* Course Info */}
          <div className="flex items-start space-x-4">
            {review.course.thumbnail ? (
              <Image
                src={review.course.thumbnail}
                alt={review.course.title}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-lg bg-gray-200"></div>
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{review.course.title}</h3>
              <Link
                href={`/courses/${review.course.slug}`}
                className="text-sm text-blue-600 hover:underline"
              >
                Xem khóa học →
              </Link>
            </div>
          </div>

          {/* Student Info */}
          <div className="flex items-start space-x-4">
            {review.student.avatar && isValidImageUrl(review.student.avatar) ? (
              <Image
                src={review.student.avatar}
                alt={review.student.fullName}
                width={64}
                height={64}
                className="rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-xl">
                {review.student.fullName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h4 className="font-semibold text-gray-900">{review.student.fullName}</h4>
              <p className="text-sm text-gray-600">{review.student.email}</p>
            </div>
          </div>

          {/* Rating */}
          <div>
            <label className="text-sm font-medium text-gray-700">Đánh giá</label>
            <div className="mt-1">{renderStars(review.rating)}</div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-sm font-medium text-gray-700">Nội dung đánh giá</label>
            <p className="mt-1 text-gray-900 whitespace-pre-wrap">{review.comment}</p>
          </div>

          {/* Instructor Response */}
          {review.instructorResponse && (
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="text-sm font-medium text-gray-700">Phản hồi từ giảng viên</label>
              <p className="mt-1 text-gray-900">{review.instructorResponse}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Trạng thái</label>
              <p className="mt-1">
                {review.isPublished ? (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    Đã xuất bản
                  </span>
                ) : (
                  <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">
                    Chưa xuất bản
                  </span>
                )}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Người thấy hữu ích</label>
              <p className="mt-1 text-gray-900">{review.helpfulCount}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Ngày tạo</label>
              <p className="mt-1 text-gray-900">
                {new Date(review.createdAt).toLocaleString('vi-VN')}
              </p>
            </div>
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

export default function AdminReviews() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminReviewsContent />
    </ProtectedRoute>
  );
}


