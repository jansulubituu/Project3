'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Star, X } from 'lucide-react';

interface ReviewFormProps {
  courseId: string;
  existingReview?: {
    _id: string;
    rating: number;
    comment: string;
  } | null;
  onSuccess: () => void;
  onCancel?: () => void;
}

export default function ReviewForm({ courseId, existingReview, onSuccess, onCancel }: ReviewFormProps) {
  const { isAuthenticated } = useAuth();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isAuthenticated) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <p className="text-blue-800">
          Vui lòng{' '}
          <a href="/login" className="font-semibold underline hover:text-blue-900">
            đăng nhập
          </a>{' '}
          để đánh giá khóa học này.
        </p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Vui lòng chọn số sao đánh giá');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Bình luận phải có ít nhất 10 ký tự');
      return;
    }

    try {
      setLoading(true);
      if (existingReview) {
        // Update existing review
        await api.put(`/reviews/${existingReview._id}`, {
          rating,
          comment: comment.trim(),
        });
      } else {
        // Create new review
        await api.post(`/courses/${courseId}/reviews`, {
          rating,
          comment: comment.trim(),
        });
      }
      onSuccess();
      if (!existingReview) {
        // Reset form only for new reviews
        setRating(0);
        setComment('');
      }
    } catch (err: unknown) {
      console.error('Failed to submit review:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string; errors?: Array<{ message: string }> } } };
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.response?.data?.errors?.[0]?.message ||
          'Có lỗi xảy ra khi gửi đánh giá';
        setError(errorMessage);
      } else {
        setError('Có lỗi xảy ra khi gửi đánh giá');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {existingReview ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá'}
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Rating Stars */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Đánh giá của bạn <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="focus:outline-none transition-transform hover:scale-110"
                aria-label={`${star} sao`}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= (hoveredRating || rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'fill-gray-200 text-gray-200'
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-3 text-sm text-gray-600">
                {rating === 1 && 'Rất tệ'}
                {rating === 2 && 'Tệ'}
                {rating === 3 && 'Bình thường'}
                {rating === 4 && 'Tốt'}
                {rating === 5 && 'Rất tốt'}
              </span>
            )}
          </div>
        </div>

        {/* Comment */}
        <div>
          <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-2">
            Bình luận của bạn <span className="text-red-500">*</span>
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={5}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            placeholder="Chia sẻ trải nghiệm của bạn về khóa học này..."
            required
            minLength={10}
            maxLength={1000}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>Tối thiểu 10 ký tự</span>
            <span>{comment.length}/1000</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
          )}
          <button
            type="submit"
            disabled={loading || rating === 0 || comment.trim().length < 10}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang gửi...' : existingReview ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}
          </button>
        </div>
      </form>
    </div>
  );
}

