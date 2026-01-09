'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface Author {
  _id: string;
  fullName: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
}

interface Reply {
  _id: string;
  content: string;
  author: Author;
  likeCount: number;
  isLiked: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
}

interface Comment {
  _id: string;
  content: string;
  author: Author;
  likeCount: number;
  isLiked: boolean;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  replies: Reply[];
  replyCount: number;
  canEdit: boolean;
  canDelete: boolean;
}

interface CommentSectionProps {
  lessonId: string;
  isEnrolled: boolean;
}

export default function CommentSection({ lessonId, isEnrolled }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20,
  });

  const loadComments = async (page = 1, sortBy: 'newest' | 'oldest' = sort, showLoadingMore = false) => {
    try {
      if (showLoadingMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await api.get(`/comments/lesson/${lessonId}`, {
        params: {
          page,
          limit: 20,
          sort: sortBy,
        },
      });

      if (response.data.success) {
        setComments(response.data.comments || []);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 20,
        });
      }
    } catch (err: any) {
      console.error('Error loading comments:', err);
      const errorMessage = err.response?.data?.message || 'Không thể tải bình luận';
      setError(errorMessage);
      
      // Show toast/notification for better UX (optional)
      if (err.response?.status === 403) {
        setError('Bạn cần đăng ký khóa học để xem bình luận');
      } else if (err.response?.status === 404) {
        setError('Bài học không tồn tại');
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (lessonId && isEnrolled) {
      loadComments(1, sort);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, isEnrolled, sort]);

  // Update pagination state when sort changes
  useEffect(() => {
    if (sort === 'newest') {
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [sort]);

  const handleCommentSuccess = () => {
    // When a new comment is created, reload from page 1 with newest sort to show it immediately
    setSort('newest');
    loadComments(1, 'newest');
  };

  const handlePageChange = (newPage: number) => {
    loadComments(newPage, sort, true);
  };

  if (!isEnrolled) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900">
          Bình luận ({pagination.totalItems})
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSort('newest')}
            disabled={loading}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              sort === 'newest'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Sắp xếp mới nhất"
          >
            Mới nhất
          </button>
          <button
            onClick={() => setSort('oldest')}
            disabled={loading}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors disabled:opacity-50 ${
              sort === 'oldest'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label="Sắp xếp cũ nhất"
          >
            Cũ nhất
          </button>
        </div>
      </div>

      {/* Comment Form */}
      <div className="mb-6">
        <CommentForm
          lessonId={lessonId}
          onSuccess={handleCommentSuccess}
          placeholder="Viết bình luận của bạn..."
        />
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3" aria-hidden="true"></div>
          <p className="text-sm text-gray-500">Đang tải bình luận...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8" role="alert">
          <div className="mb-4">
            <svg className="mx-auto h-12 w-12 text-red-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-red-600 font-medium">{error}</p>
          </div>
          <button
            onClick={() => loadComments(pagination.currentPage, sort)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            aria-label="Thử lại tải bình luận"
          >
            Thử lại
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <p className="text-gray-500">Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem
                key={comment._id}
                comment={comment}
                lessonId={lessonId}
                onUpdate={handleCommentSuccess}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
              <button
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loadingMore}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Trang trước"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></span>
                    Đang tải...
                  </span>
                ) : (
                  'Trước'
                )}
              </button>
              <span className="text-sm text-gray-600" aria-label={`Trang ${pagination.currentPage} trong tổng ${pagination.totalPages} trang`}>
                Trang {pagination.currentPage} / {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage === pagination.totalPages || loadingMore}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Trang sau"
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></span>
                    Đang tải...
                  </span>
                ) : (
                  'Sau'
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
