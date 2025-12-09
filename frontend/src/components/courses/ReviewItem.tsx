'use client';

import { useState } from 'react';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { Star, ThumbsUp, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import { Review } from '@/types';
import { isValidImageUrl } from '@/lib/utils';

interface ReviewItemProps {
  review: Review;
  isOwner?: boolean;
  isInstructor?: boolean;
  onUpdate?: () => void;
  onDelete?: () => void;
  onVoteOrResponse?: () => void; // Callback when helpful vote or instructor response is added
}

export default function ReviewItem({
  review,
  isOwner = false,
  isInstructor = false,
  onUpdate,
  onDelete,
  onVoteOrResponse,
}: ReviewItemProps) {
  const { user, isAuthenticated } = useAuth();
  const [helpfulLoading, setHelpfulLoading] = useState(false);
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [responseText, setResponseText] = useState(review.instructorResponse || '');
  const [responseLoading, setResponseLoading] = useState(false);
  const [responseError, setResponseError] = useState('');

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'
        }`}
      />
    ));
  };

  const handleHelpful = async () => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để đánh giá hữu ích');
      return;
    }

    try {
      setHelpfulLoading(true);
      await api.post(`/reviews/${review._id}/helpful`, {
        isHelpful: true,
      });
      // Notify parent to refresh reviews
      if (onVoteOrResponse) {
        onVoteOrResponse();
      }
    } catch (err) {
      console.error('Failed to mark helpful:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errorMessage = axiosError.response?.data?.message || 'Không thể đánh giá hữu ích';
        alert(errorMessage);
      }
    } finally {
      setHelpfulLoading(false);
    }
  };

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    setResponseError('');

    if (responseText.trim().length === 0) {
      setResponseError('Vui lòng nhập phản hồi');
      return;
    }

    if (responseText.trim().length > 500) {
      setResponseError('Phản hồi không được vượt quá 500 ký tự');
      return;
    }

    try {
      setResponseLoading(true);
      await api.post(`/reviews/${review._id}/response`, {
        response: responseText.trim(),
      });
      setShowResponseForm(false);
      // Notify parent to refresh reviews
      if (onVoteOrResponse) {
        onVoteOrResponse();
      }
    } catch (err) {
      console.error('Failed to submit response:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errorMessage = axiosError.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi';
        setResponseError(errorMessage);
      } else {
        setResponseError('Có lỗi xảy ra khi gửi phản hồi');
      }
    } finally {
      setResponseLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa đánh giá này?')) {
      return;
    }

    try {
      await api.delete(`/reviews/${review._id}`);
      // Wait a bit to ensure backend has processed the deletion and updated course rating
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Failed to delete review:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        const errorMessage = axiosError.response?.data?.message || 'Có lỗi xảy ra khi xóa đánh giá';
        alert(errorMessage);
      } else {
        alert('Có lỗi xảy ra khi xóa đánh giá');
      }
    }
  };

  const student = typeof review.student === 'object' ? review.student : null;
  const studentName = student?.fullName || 'Người dùng';
  const studentAvatar = student?.avatar || '';

  return (
    <div className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0">
      <div className="flex items-start space-x-4">
        {/* Avatar */}
        {studentAvatar && isValidImageUrl(studentAvatar) ? (
          <Image
            src={studentAvatar}
            alt={studentName}
            width={48}
            height={48}
            className="rounded-full flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
            {studentName.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-semibold text-gray-900">{studentName}</h4>
                {isOwner && (
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    Đánh giá của bạn
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">{renderStars(review.rating)}</div>
                <span className="text-sm text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={onUpdate}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  aria-label="Chỉnh sửa"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  aria-label="Xóa"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Comment */}
          <p className="text-gray-700 mt-2 whitespace-pre-line">{review.comment}</p>

          {/* Helpful Button */}
          {!isOwner && isAuthenticated && (
            <div className="mt-3 flex items-center space-x-4">
              <button
                onClick={handleHelpful}
                disabled={helpfulLoading}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Hữu ích</span>
                {review.helpfulCount > 0 && (
                  <span className="text-gray-500">({review.helpfulCount})</span>
                )}
              </button>
            </div>
          )}

          {/* Helpful Count (for non-interactive display) */}
          {!isAuthenticated && review.helpfulCount > 0 && (
            <div className="mt-3 text-sm text-gray-500 flex items-center space-x-1">
              <ThumbsUp className="w-4 h-4" />
              <span>{review.helpfulCount} người thấy hữu ích</span>
            </div>
          )}

          {/* Instructor Response */}
          {review.instructorResponse && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-lg p-4">
              <div className="flex items-start space-x-2 mb-2">
                <MessageSquare className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="font-semibold text-blue-900">Phản hồi từ giảng viên</h5>
                    {review.respondedAt && (
                      <span className="text-xs text-blue-600">
                        {new Date(review.respondedAt).toLocaleDateString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <p className="text-blue-800 whitespace-pre-line">{review.instructorResponse}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructor Response Form */}
          {isInstructor && !review.instructorResponse && (
            <div className="mt-4">
              {!showResponseForm ? (
                <button
                  onClick={() => setShowResponseForm(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Phản hồi đánh giá này</span>
                </button>
              ) : (
                <form onSubmit={handleSubmitResponse} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <label htmlFor="response" className="block text-sm font-medium text-blue-900 mb-2">
                    Phản hồi của bạn
                  </label>
                  <textarea
                    id="response"
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                    placeholder="Viết phản hồi cho đánh giá này..."
                    maxLength={500}
                  />
                  <div className="mt-1 flex items-center justify-between text-xs text-blue-600">
                    <span>Tối đa 500 ký tự</span>
                    <span>{responseText.length}/500</span>
                  </div>
                  {responseError && (
                    <div className="mt-2 text-sm text-red-600">{responseError}</div>
                  )}
                  <div className="flex items-center justify-end space-x-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowResponseForm(false);
                        setResponseText('');
                        setResponseError('');
                      }}
                      className="px-3 py-1.5 text-sm text-blue-700 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={responseLoading || responseText.trim().length === 0}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {responseLoading ? 'Đang gửi...' : 'Gửi phản hồi'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

