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
  enrollmentStatus?: 'active' | 'completed' | null;
  onEnrollmentChange: () => void;
}

export default function EnrollmentButton({
  courseId,
  courseSlug,
  price,
  discountPrice,
  isEnrolled,
  enrollmentStatus,
  onEnrollmentChange,
}: EnrollmentButtonProps) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleEnroll = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/courses/${courseSlug}`);
      return;
    }

    // Check if user is student (only students can enroll)
    if (user && user.role !== 'student') {
      setError('Chỉ học viên mới có thể đăng ký khóa học');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess(false);

      // For free courses, enroll directly
      if (price === 0) {
        const response = await api.post('/enrollments', { 
          course: courseId // Backend expects 'course' field, not 'courseId'
        });
        
        if (response.data.success) {
          setSuccess(true);
          // Call callback to update parent component
          onEnrollmentChange();
          
          // Show success message briefly before redirecting
          setTimeout(() => {
            router.push(`/courses/${courseSlug}/learn`);
          }, 1000);
        } else {
          setError(response.data.message || 'Đăng ký thất bại');
        }
      } else {
        // For paid courses, redirect to checkout
        router.push(`/courses/${courseSlug}/checkout`);
      }
    } catch (err: unknown) {
      console.error('Enrollment error:', err);
      
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { 
          response?: { 
            status?: number; 
            data?: { 
              message?: string;
              error?: string;
            } 
          } 
        };
        
        const status = axiosError.response?.status;
        const errorData = axiosError.response?.data;
        const errorMessage = errorData?.message || errorData?.error || 'Có lỗi xảy ra khi đăng ký';
        
        if (status === 401) {
          // Unauthorized - redirect to login
          router.push(`/login?redirect=/courses/${courseSlug}`);
        } else if (status === 403) {
          // Forbidden - user doesn't have permission
          setError('Bạn không có quyền đăng ký khóa học này');
        } else if (status === 404) {
          // Course not found
          setError('Khóa học không tồn tại');
        } else if (status === 409) {
          // Already enrolled
          setError('Bạn đã đăng ký khóa học này rồi');
          // Refresh enrollment status
          setTimeout(() => {
            onEnrollmentChange();
          }, 1000);
        } else if (status === 400) {
          // Bad request - validation error
          setError(errorMessage);
        } else {
          setError(errorMessage);
        }
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Có lỗi xảy ra khi đăng ký';
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Show enrolled state
  if (isEnrolled) {
    const isCompleted = enrollmentStatus === 'completed';
    
    return (
      <div className="space-y-3">
        {isCompleted ? (
          <>
            <div className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center rounded-lg font-semibold shadow-md">
              🎉 Bạn đã hoàn thành khóa học
            </div>
            <Link
              href={`/courses/${courseSlug}/learn`}
              className="block w-full px-6 py-3 bg-gray-100 text-gray-700 text-center rounded-lg font-semibold hover:bg-gray-200 transition-colors border border-gray-300"
            >
              Xem lại nội dung
            </Link>
            <p className="text-sm text-purple-600 text-center font-medium">
              ✓ Chúc mừng bạn đã hoàn thành khóa học này
            </p>
          </>
        ) : (
          <>
            <Link
              href={`/courses/${courseSlug}/learn`}
              className="block w-full px-6 py-3 bg-green-600 text-white text-center rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-md"
            >
              Vào học ngay
            </Link>
            <p className="text-sm text-green-600 text-center font-medium">
              ✓ Bạn đã đăng ký khóa học này
            </p>
          </>
        )}
      </div>
    );
  }

  // Calculate display price
  const displayPrice = discountPrice && discountPrice < price ? discountPrice : price;
  const hasDiscount = discountPrice && discountPrice < price;

  return (
    <div className="space-y-2">
      {/* Success Message */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 text-center font-medium">
            ✓ Đăng ký thành công! Đang chuyển hướng...
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 text-center">{error}</p>
        </div>
      )}

      {/* Enrollment Button */}
      <button
        onClick={handleEnroll}
        disabled={loading || success}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
      >
        {loading ? (
          <span className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Đang xử lý...
          </span>
        ) : success ? (
          'Đăng ký thành công!'
        ) : price === 0 ? (
          'Đăng ký miễn phí'
        ) : (
          `Đăng ký ngay - ${displayPrice === 0 ? 'Miễn phí' : new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(displayPrice)}`
        )}
      </button>

      {/* Additional Info */}
      {price > 0 && !loading && !success && (
        <div className="space-y-1">
          {hasDiscount && (
            <p className="text-xs text-gray-500 text-center line-through">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price)}
            </p>
          )}
          <p className="text-xs text-gray-500 text-center">
            Hoàn tiền trong 30 ngày nếu không hài lòng
          </p>
        </div>
      )}

      {/* Free Course Info */}
      {price === 0 && !loading && !success && (
        <p className="text-xs text-gray-500 text-center">
          Đăng ký miễn phí và bắt đầu học ngay
        </p>
      )}
    </div>
  );
}

