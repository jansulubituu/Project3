'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface CommentFormProps {
  lessonId: string;
  parentCommentId?: string;
  onSuccess: () => void;
  onCancel?: () => void;
  placeholder?: string;
}

export default function CommentForm({
  lessonId,
  parentCommentId,
  onSuccess,
  onCancel,
  placeholder = 'Viết bình luận của bạn...',
}: CommentFormProps) {
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Nội dung không được để trống');
      return;
    }

    if (content.length > 2000) {
      setError('Nội dung không được vượt quá 2000 ký tự');
      return;
    }

    const contentToSubmit = content.trim();
    
    try {
      setSubmitting(true);
      setError(null);

      // Optimistic update: Clear form immediately for better UX
      setContent('');

      if (parentCommentId) {
        // Reply to comment
        await api.post(`/comments/${parentCommentId}/reply`, {
          content: contentToSubmit,
        });
      } else {
        // Create new comment
        await api.post(`/comments/lesson/${lessonId}`, {
          content: contentToSubmit,
        });
      }

      onSuccess();
    } catch (err: any) {
      console.error('Error submitting comment:', err);
      // Restore content on error
      setContent(contentToSubmit);
      const errorMessage = err.response?.data?.message || 'Không thể gửi bình luận. Vui lòng thử lại.';
      setError(errorMessage);
      
      // Show more specific error messages
      if (err.response?.status === 403) {
        setError('Bạn cần đăng ký khóa học để bình luận');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Dữ liệu không hợp lệ');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3" aria-label={parentCommentId ? 'Form trả lời bình luận' : 'Form bình luận'}>
      <div>
        <label htmlFor={`comment-textarea-${parentCommentId || lessonId}`} className="sr-only">
          {placeholder}
        </label>
        <textarea
          id={`comment-textarea-${parentCommentId || lessonId}`}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setError(null);
          }}
          placeholder={placeholder}
          rows={3}
          maxLength={2000}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:cursor-not-allowed"
          disabled={submitting}
          aria-describedby={error ? `comment-error-${parentCommentId || lessonId}` : `comment-counter-${parentCommentId || lessonId}`}
          aria-invalid={error ? 'true' : 'false'}
        />
        <div className="flex items-center justify-between mt-1">
          <div 
            id={`comment-counter-${parentCommentId || lessonId}`}
            className={`text-xs ${content.length > 1900 ? 'text-orange-600' : 'text-gray-500'}`}
            aria-live="polite"
          >
            {content.length}/2000
          </div>
          {error && (
            <div 
              id={`comment-error-${parentCommentId || lessonId}`}
              className="text-xs text-red-600" 
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          aria-label={submitting ? 'Đang gửi...' : parentCommentId ? 'Gửi phản hồi' : 'Gửi bình luận'}
        >
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Đang gửi...
            </span>
          ) : (
            parentCommentId ? 'Trả lời' : 'Gửi bình luận'
          )}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Hủy bình luận"
          >
            Hủy
          </button>
        )}
      </div>
    </form>
  );
}
