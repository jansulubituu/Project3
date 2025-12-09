'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { ReviewResponse, Review } from '@/types';
import ReviewForm from './ReviewForm';
import ReviewItem from './ReviewItem';
import RatingDisplay from './RatingDisplay';

interface CourseReviewsProps {
  courseId: string;
  isEnrolled?: boolean;
  courseInstructorId?: string;
  onReviewUpdate?: () => void; // Callback to update parent component (e.g., course header)
}

export default function CourseReviews({ courseId, isEnrolled = false, courseInstructorId, onReviewUpdate }: CourseReviewsProps) {
  const { user } = useAuth();
  const [reviewsData, setReviewsData] = useState<ReviewResponse | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [userReview, setUserReview] = useState<Review | null>(null);

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, sort]);

  useEffect(() => {
    if (page > 1) {
      fetchMoreReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}/reviews`, {
        params: { page: 1, limit: 10, sort },
      });
      if (response.data.success) {
        const data = response.data as ReviewResponse;
        setReviewsData(data);
        setReviews(data.reviews || []);
        setHasMore(data.pagination.currentPage < data.pagination.totalPages);
        
        // Find user's review
        if (user) {
          const myReview = data.reviews.find(
            (r) => typeof r.student === 'object' && r.student._id === user.id
          );
          setUserReview(myReview || null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreReviews = async () => {
    try {
      const response = await api.get(`/courses/${courseId}/reviews`, {
        params: { page, limit: 10, sort },
      });
      if (response.data.success) {
        const data = response.data as ReviewResponse;
        setReviews((prev) => [...prev, ...(data.reviews || [])]);
        setHasMore(data.pagination.currentPage < data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Failed to fetch more reviews:', error);
    }
  };

  const handleReviewSuccess = async () => {
    setShowReviewForm(false);
    setEditingReview(null);
    // Reset to page 1 and refetch
    setPage(1);
    await fetchReviews();
    // Notify parent component to update course data (rating, totalReviews)
    if (onReviewUpdate) {
      onReviewUpdate();
    }
  };

  const handleEditReview = (review: Review) => {
    setEditingReview(review);
    setShowReviewForm(true);
  };

  const handleDeleteReview = async () => {
    // Wait a bit to ensure backend has processed everything
    await new Promise((resolve) => setTimeout(resolve, 300));
    // Refetch reviews after deletion
    await fetchReviews();
    // Notify parent component to update course data (rating, totalReviews)
    if (onReviewUpdate) {
      // Add a small delay to ensure backend has updated course rating
      setTimeout(() => {
        onReviewUpdate();
      }, 200);
    }
  };

  const handleUpdateReview = async () => {
    // Refetch reviews after update (e.g., helpful vote, response)
    await fetchReviews();
    // Notify parent component to update course data (in case rating changed)
    if (onReviewUpdate) {
      onReviewUpdate();
    }
  };

  const isCourseInstructor = !!courseInstructorId && user?.id === courseInstructorId;
  const isInstructor = (user?.role === 'instructor' || user?.role === 'admin') && isCourseInstructor;

  if (loading && reviews.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải đánh giá...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Rating Display */}
      {reviewsData && (
        <RatingDisplay
          averageRating={reviewsData.course.averageRating}
          totalReviews={reviewsData.course.totalReviews}
          ratingDistribution={reviewsData.ratingDistribution}
        />
      )}

      {/* Review Form */}
      {isEnrolled && user && (
        <div>
          {!userReview && !showReviewForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <p className="text-blue-800">
                  Bạn đã tham gia khóa học này. Hãy chia sẻ đánh giá của bạn!
                </p>
                <button
                  onClick={() => setShowReviewForm(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Viết đánh giá
                </button>
              </div>
            </div>
          )}

          {(showReviewForm || editingReview) && (
            <div className="mb-6">
              <ReviewForm
                courseId={courseId}
                existingReview={editingReview || undefined}
                onSuccess={handleReviewSuccess}
                onCancel={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Đánh giá ({reviewsData?.course.totalReviews || 0})
          </h2>
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
            {isEnrolled && user && !userReview && (
              <p className="text-sm text-gray-500 mt-2">Hãy là người đầu tiên đánh giá khóa học này!</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => {
              const isOwner =
                !!user &&
                typeof review.student === 'object' &&
                review.student._id === user.id;
              const isCourseInstructor = isInstructor; // You might want to check if user is the course instructor

              return (
                <ReviewItem
                  key={review._id}
                  review={review}
                  isOwner={isOwner}
                  isInstructor={isCourseInstructor}
                  onUpdate={() => handleEditReview(review)}
                  onDelete={handleDeleteReview}
                  onVoteOrResponse={handleUpdateReview}
                />
              );
            })}

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
    </div>
  );
}
