'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';

interface Review {
  _id: string;
  student: {
    _id: string;
    fullName: string;
    avatar: string;
  };
  rating: number;
  comment: string;
  helpfulCount: number;
  createdAt: string;
}

interface CourseReviewsProps {
  courseId: string;
}

export default function CourseReviews({ courseId }: CourseReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sort, page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}/reviews`, {
        params: { page, limit: 10, sort },
      });
      if (response.data.success) {
        if (page === 1) {
          setReviews(response.data.reviews || []);
        } else {
          setReviews((prev) => [...prev, ...(response.data.reviews || [])]);
        }
        setHasMore(
          response.data.pagination.currentPage < response.data.pagination.totalPages
        );
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span key={i} className={i < rating ? 'text-yellow-400' : 'text-gray-300'}>
        ★
      </span>
    ));
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải đánh giá...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Đánh giá</h2>
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
        >
          <option value="recent">Mới nhất</option>
          <option value="helpful">Hữu ích nhất</option>
          <option value="rating_high">Đánh giá cao nhất</option>
          <option value="rating_low">Đánh giá thấp nhất</option>
        </select>
      </div>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Chưa có đánh giá nào</p>
        </div>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <div key={review._id} className="border-b pb-6 last:border-b-0 last:pb-0">
              <div className="flex items-start space-x-4">
                {review.student.avatar ? (
                  <Image
                    src={review.student.avatar}
                    alt={review.student.fullName}
                    width={48}
                    height={48}
                    className="rounded-full flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {review.student.fullName.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{review.student.fullName}</h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 mt-2 whitespace-pre-line">{review.comment}</p>
                  {review.helpfulCount > 0 && (
                    <div className="mt-3 text-sm text-gray-500">
                      👍 {review.helpfulCount} người thấy hữu ích
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={loading}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {loading ? 'Đang tải...' : 'Tải thêm đánh giá'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

