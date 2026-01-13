'use client';

import { Edit, Copy, Trash2, Eye, EyeOff, Archive, BarChart3 } from 'lucide-react';
import type { CurriculumItem, LessonItem, ExamItem } from '@/app/instructor/courses/[id]/curriculum/page';

interface ItemActionsMenuProps {
  item: CurriculumItem;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
  onArchive?: () => void;
  onViewAnalytics?: () => void;
  position?: 'left' | 'right';
}

export default function ItemActionsMenu({
  item,
  onEdit,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
  onArchive,
  onViewAnalytics,
  position = 'right',
}: ItemActionsMenuProps) {
  return (
    <div
      className={`absolute ${position === 'right' ? 'right-0' : 'left-0'} top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[200px] overflow-hidden`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Common Actions */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
      >
        <Edit className="w-4 h-4" />
        <span>Chỉnh sửa</span>
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDuplicate();
        }}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-700 transition-colors flex items-center gap-2 border-t border-gray-100"
      >
        <Copy className="w-4 h-4" />
        <span>Sao chép</span>
      </button>

      {/* Lesson-specific Actions */}
      {item.type === 'lesson' && (
        <>
          {(item as LessonItem).isPublished ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onUnpublish?.();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              <EyeOff className="w-4 h-4" />
              <span>Bỏ xuất bản</span>
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPublish?.();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              <Eye className="w-4 h-4" />
              <span>Xuất bản</span>
            </button>
          )}
        </>
      )}

      {/* Exam-specific Actions */}
      {item.type === 'exam' && (
        <>
          {onViewAnalytics && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewAnalytics();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Xem phân tích</span>
            </button>
          )}

          {(item as ExamItem).status !== 'archived' && onArchive && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchive();
              }}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors flex items-center gap-2 border-t border-gray-100"
            >
              <Archive className="w-4 h-4" />
              <span>Lưu trữ</span>
            </button>
          )}
        </>
      )}

      {/* Delete Action */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2 border-t border-gray-100"
      >
        <Trash2 className="w-4 h-4" />
        <span>Xóa</span>
      </button>
    </div>
  );
}
