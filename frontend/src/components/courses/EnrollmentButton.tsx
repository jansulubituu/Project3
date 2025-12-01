'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface EnrollmentButtonProps {
  courseId: string;
  courseSlug: string;
  price: number;
  discountPrice?: number;
  isEnrolled: boolean;
  onEnrollmentChange: () => void;
}

export default function EnrollmentButton({
  courseId,
  courseSlug,
  price,
  isEnrolled,
  onEnrollmentChange,
}: EnrollmentButtonProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/courses/${courseSlug}`);
      return;
    }

    try {
      setLoading(true);
      setError('');

      // For free courses, enroll directly
      if (price === 0) {
        const response = await api.post('/enrollments', { courseId });
        if (response.data.success) {
          onEnrollmentChange();
          router.push(`/courses/${courseSlug}/learn`);
        } else {
          setError('Đăng ký thất bại');
        }
      } else {
        // For paid courses, redirect to payment
        router.push(`/courses/${courseSlug}/checkout`);
      }
    } catch (err: unknown) {
      console.error('Enrollment error:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number; data?: { message?: string } } };
        if (axiosError.response?.status === 401) {
          router.push(`/login?redirect=/courses/${courseSlug}`);
        } else {
          setError(axiosError.response?.data?.message || 'Có lỗi xảy ra khi đăng ký');
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (isEnrolled) {
    return (
      <div className="space-y-3">
        <Link
          href={`/courses/${courseSlug}/learn`}
          className="block w-full px-6 py-3 bg-green-600 text-white text-center rounded-lg font-semibold hover:bg-green-700 transition-colors"
        >
          Vào học ngay
        </Link>
        <p className="text-sm text-green-600 text-center">
          ✓ Bạn đã đăng ký khóa học này
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleEnroll}
        disabled={loading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Đang xử lý...' : price === 0 ? 'Đăng ký miễn phí' : 'Đăng ký ngay'}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center">{error}</p>
      )}
      {price > 0 && (
        <p className="text-xs text-gray-500 text-center">
          Hoàn tiền trong 30 ngày nếu không hài lòng
        </p>
      )}
    </div>
  );
}

