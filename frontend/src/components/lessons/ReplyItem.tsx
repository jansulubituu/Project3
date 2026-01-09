'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import Image from 'next/image';
import { Heart, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { isValidImageUrl } from '@/lib/utils';

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

interface ReplyItemProps {
  reply: Reply;
  canEdit: boolean;
  canDelete: boolean;
  onUpdate: () => void;
}

export default function ReplyItem({ reply, canEdit, canDelete, onUpdate }: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
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
    const previousLiked = optimisticIsLiked !== null ? optimisticIsLiked : reply.isLiked;
    const previousLikeCount = optimisticLikeCount !== null ? optimisticLikeCount : reply.likeCount;
    const newLiked = !previousLiked;
    const newLikeCount = newLiked ? previousLikeCount + 1 : previousLikeCount - 1;

    // Update UI immediately
    setOptimisticIsLiked(newLiked);
    setOptimisticLikeCount(newLikeCount);

    try {
      setLiking(true);
      await api.post(`/comments/${reply._id}/like`);
      // Clear optimistic state and refresh to get accurate data
      setOptimisticIsLiked(null);
      setOptimisticLikeCount(null);
      onUpdate();
    } catch (err) {
      // Revert on error
      setOptimisticIsLiked(null);
      setOptimisticLikeCount(null);
      console.error('Error toggling like:', err);
      alert('Không thể thích phản hồi. Vui lòng thử lại.');
    } finally {
      setLiking(false);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim() || editContent.length > 2000) return;

    try {
      setEditing(true);
      await api.put(`/comments/${reply._id}`, {
        content: editContent.trim(),
      });
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      console.error('Error editing reply:', err);
      alert(err.response?.data?.message || 'Không thể chỉnh sửa phản hồi');
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa phản hồi này?')) return;

    try {
      setDeleting(true);
      await api.delete(`/comments/${reply._id}`);
      onUpdate();
    } catch (err: any) {
      console.error('Error deleting reply:', err);
      alert(err.response?.data?.message || 'Không thể xóa phản hồi');
    } finally {
      setDeleting(false);
    }
  };

  if (isEditing) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={2}
          maxLength={2000}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-500">
            {editContent.length}/2000
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(reply.content);
              }}
              className="px-3 py-1 text-xs text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Hủy
            </button>
            <button
              onClick={handleEdit}
              disabled={editing || !editContent.trim()}
              className="px-3 py-1 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {editing ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-1.5 sm:gap-2">
      {/* Avatar */}
      <div className="flex-shrink-0">
        {reply.author.avatar && isValidImageUrl(reply.author.avatar) ? (
          <Image
            src={reply.author.avatar}
            alt={reply.author.fullName}
            width={32}
            height={32}
            className="rounded-full w-6 h-6 sm:w-8 sm:h-8"
          />
        ) : (
          <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-medium">
            {reply.author.fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
          <span className="font-medium text-xs sm:text-sm text-gray-900">{reply.author.fullName}</span>
          {getRoleBadge(reply.author.role)}
          <span className="text-xs text-gray-500">• {formatTime(reply.createdAt)}</span>
          {reply.isEdited && (
            <span className="text-xs text-gray-400">(đã chỉnh sửa)</span>
          )}
        </div>

        <p className="text-xs sm:text-sm text-gray-700 mb-1.5 sm:mb-2 whitespace-pre-wrap break-words">{reply.content}</p>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1 text-xs transition-colors ${
              (optimisticIsLiked !== null ? optimisticIsLiked : reply.isLiked)
                ? 'text-red-600 hover:text-red-700'
                : 'text-gray-600 hover:text-gray-700'
            } disabled:opacity-50`}
            aria-label={(optimisticIsLiked !== null ? optimisticIsLiked : reply.isLiked) ? 'Bỏ thích' : 'Thích'}
          >
            <Heart className={`w-3.5 h-3.5 ${(optimisticIsLiked !== null ? optimisticIsLiked : reply.isLiked) ? 'fill-current' : ''}`} />
            <span>{optimisticLikeCount !== null ? optimisticLikeCount : reply.likeCount}</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="text-xs text-gray-600 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              aria-label="Chỉnh sửa phản hồi"
            >
              Chỉnh sửa
            </button>
          )}

          {canDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="text-xs text-gray-600 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded p-1"
                aria-label="Tùy chọn phản hồi"
                aria-expanded={showMenu}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[100px]">
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Xóa
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
