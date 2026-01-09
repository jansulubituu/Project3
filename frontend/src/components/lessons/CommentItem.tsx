'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Heart, Reply, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { isValidImageUrl } from '@/lib/utils';
import CommentForm from './CommentForm';
import ReplyItem from './ReplyItem';

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

interface CommentItemProps {
  comment: Comment;
  lessonId: string;
  onUpdate: () => void;
}

export default function CommentItem({ comment, lessonId, onUpdate }: CommentItemProps) {
  const { user } = useAuth();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  // Optimistic updates for likes
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(null);
  const [optimisticIsLiked, setOptimisticIsLiked] = useState<boolean | null>(null);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Vừa xong';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
    
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'instructor':
        return (
          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            Giảng viên
          </span>
        );
      case 'admin':
        return (
          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium">
            Admin
          </span>
        );
      default:
        return null;
    }
  };

  const handleLike = async () => {
    if (liking) return;

    // Optimistic update
    const previousLiked = optimisticIsLiked !== null ? optimisticIsLiked : comment.isLiked;
    const previousLikeCount = optimisticLikeCount !== null ? optimisticLikeCount : comment.likeCount;
    const newLiked = !previousLiked;
    const newLikeCount = newLiked ? previousLikeCount + 1 : previousLikeCount - 1;

    // Update UI immediately
    setOptimisticIsLiked(newLiked);
    setOptimisticLikeCount(newLikeCount);

    try {
      setLiking(true);
      await api.post(`/comments/${comment._id}/like`);
      // Clear optimistic state and refresh to get accurate data
      setOptimisticIsLiked(null);
      setOptimisticLikeCount(null);
      onUpdate();
    } catch (err) {
      // Revert on error
      setOptimisticIsLiked(null);
      setOptimisticLikeCount(null);
      console.error('Error toggling like:', err);
      alert('Không thể thích bình luận. Vui lòng thử lại.');
    } finally {
      setLiking(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent.length > 2000) return;

    try {
      setEditing(true);
      await api.put(`/comments/${comment._id}`, {
        content: editContent.trim(),
      });
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      console.error('Error editing comment:', err);
      alert(err.response?.data?.message || 'Không thể chỉnh sửa bình luận');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa bình luận này?')) return;

    try {
      setDeleting(true);
      await api.delete(`/comments/${comment._id}`);
      onUpdate();
    } catch (err: any) {
      console.error('Error deleting comment:', err);
      alert(err.response?.data?.message || 'Không thể xóa bình luận');
    } finally {
      setDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            {editContent.length}/2000
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(comment.content);
              }}
              className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              onClick={handleEdit}
              disabled={editing || !editContent.trim()}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editing ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 border border-gray-200">
      <div className="flex items-start gap-2 sm:gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {comment.author.avatar && isValidImageUrl(comment.author.avatar) ? (
            <Image
              src={comment.author.avatar}
              alt={comment.author.fullName}
              width={40}
              height={40}
              className="rounded-full w-8 h-8 sm:w-10 sm:h-10"
            />
          ) : (
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium text-xs sm:text-sm">
              {comment.author.fullName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
            <span className="font-semibold text-sm sm:text-base text-gray-900">{comment.author.fullName}</span>
            {getRoleBadge(comment.author.role)}
            <span className="text-xs sm:text-sm text-gray-500">• {formatTime(comment.createdAt)}</span>
            {comment.isEdited && (
              <span className="text-xs text-gray-400">(đã chỉnh sửa)</span>
            )}
          </div>

          <p className="text-sm sm:text-base text-gray-700 mb-2 sm:mb-3 whitespace-pre-wrap break-words">{comment.content}</p>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <button
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm transition-colors ${
                (optimisticIsLiked !== null ? optimisticIsLiked : comment.isLiked)
                  ? 'text-red-600 hover:text-red-700'
                  : 'text-gray-600 hover:text-gray-700'
              } disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1`}
              aria-label={(optimisticIsLiked !== null ? optimisticIsLiked : comment.isLiked) ? 'Bỏ thích' : 'Thích'}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${(optimisticIsLiked !== null ? optimisticIsLiked : comment.isLiked) ? 'fill-current' : ''}`} />
              <span>{optimisticLikeCount !== null ? optimisticLikeCount : comment.likeCount}</span>
            </button>

            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              aria-label="Trả lời bình luận"
            >
              <Reply className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Trả lời</span>
            </button>

            {comment.canEdit && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
                aria-label="Chỉnh sửa bình luận"
              >
                <Edit2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Chỉnh sửa</span>
              </button>
            )}

            {comment.canDelete && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-700 transition-colors"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[120px]">
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Reply Form */}
          {showReplyForm && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200">
              <CommentForm
                lessonId={lessonId}
                parentCommentId={comment._id}
                onSuccess={() => {
                  setShowReplyForm(false);
                  onUpdate();
                }}
                onCancel={() => setShowReplyForm(false)}
                placeholder="Viết phản hồi..."
              />
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 pl-4 border-l-2 border-gray-200 space-y-3">
              {comment.replies.map((reply) => {
                // Calculate canEdit and canDelete for reply
                const replyCanEdit = user && reply.author._id === user.id;
                const replyCanDelete = replyCanEdit || user?.role === 'admin' || user?.role === 'instructor';
                
                return (
                  <ReplyItem
                    key={reply._id}
                    reply={reply}
                    canEdit={replyCanEdit || false}
                    canDelete={replyCanDelete || false}
                    onUpdate={onUpdate}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
