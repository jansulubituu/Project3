'use client';

import { Clock, CheckCircle2, XCircle, FileText, Archive } from 'lucide-react';

interface CourseStatusBadgeProps {
  status: 'draft' | 'pending' | 'published' | 'rejected' | 'archived';
}

export default function CourseStatusBadge({ status }: CourseStatusBadgeProps) {
  const statusConfig = {
    draft: {
      label: 'Bản nháp',
      icon: FileText,
      className: 'bg-gray-100 text-gray-800',
    },
    pending: {
      label: 'Chờ duyệt',
      icon: Clock,
      className: 'bg-yellow-100 text-yellow-800',
    },
    published: {
      label: 'Đã xuất bản',
      icon: CheckCircle2,
      className: 'bg-green-100 text-green-800',
    },
    rejected: {
      label: 'Đã từ chối',
      icon: XCircle,
      className: 'bg-red-100 text-red-800',
    },
    archived: {
      label: 'Đã lưu trữ',
      icon: Archive,
      className: 'bg-gray-100 text-gray-600',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.className}`}
    >
      <Icon className="w-4 h-4 mr-1.5" />
      {config.label}
    </span>
  );
}
