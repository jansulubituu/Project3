'use client';

import { Inbox, Search, Filter } from 'lucide-react';

interface EmptyStateProps {
  type?: 'no-results' | 'no-data' | 'search' | 'filter';
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode; // Allow custom action element
  icon?: string; // Allow custom icon (emoji or component name)
  className?: string;
}

export default function EmptyState({
  type = 'no-data',
  title,
  message,
  actionLabel,
  onAction,
  action,
  icon,
  className = '',
}: EmptyStateProps) {
  const defaultConfig = {
    'no-results': {
      icon: Search,
      defaultTitle: 'Không tìm thấy kết quả',
      defaultMessage: 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc của bạn.',
    },
    'no-data': {
      icon: Inbox,
      defaultTitle: 'Chưa có thông báo nào',
      defaultMessage: 'Bạn chưa có thông báo nào. Thông báo mới sẽ xuất hiện ở đây.',
    },
    search: {
      icon: Search,
      defaultTitle: 'Không có kết quả tìm kiếm',
      defaultMessage: 'Thử tìm kiếm với từ khóa khác.',
    },
    filter: {
      icon: Filter,
      defaultTitle: 'Không có kết quả phù hợp',
      defaultMessage: 'Thử thay đổi bộ lọc để xem thêm kết quả.',
    },
  };

  const config = defaultConfig[type];
  const Icon = config.icon;
  const displayTitle = title || config.defaultTitle;
  const displayMessage = message || config.defaultMessage;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-12 text-center ${className}`}>
      <div className="flex flex-col items-center">
        {icon ? (
          <div className="text-6xl mb-4">{icon}</div>
        ) : (
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon className="w-8 h-8 text-gray-400" />
          </div>
        )}
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{displayTitle}</h3>
        <p className="text-sm text-gray-600 max-w-md mb-6">{displayMessage}</p>
        {action || (onAction && actionLabel && (
          <button
            onClick={onAction}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            {actionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}
