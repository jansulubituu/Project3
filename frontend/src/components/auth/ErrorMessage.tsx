'use client';

import { AlertCircle, X, AlertTriangle, Info } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  className?: string;
}

export default function ErrorMessage({ 
  error, 
  type = 'error',
  onDismiss,
  className = ''
}: ErrorMessageProps) {
  const typeStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      icon: AlertCircle,
      iconColor: 'text-red-600',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      icon: AlertTriangle,
      iconColor: 'text-yellow-600',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-700',
      icon: Info,
      iconColor: 'text-blue-600',
    },
  };

  const styles = typeStyles[type];
  const Icon = styles.icon;

  return (
    <div 
      className={`${styles.bg} ${styles.border} ${styles.text} border rounded-lg px-4 py-3 flex items-start gap-3 ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <Icon className={`${styles.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{error}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`${styles.text} hover:opacity-70 transition-opacity flex-shrink-0 p-1`}
          aria-label="Đóng thông báo lỗi"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
