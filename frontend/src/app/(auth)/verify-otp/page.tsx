'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';

function VerifyOTPContent() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (/^\d+$/.test(pastedData)) {
      const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = Math.min(pastedData.length, 5);
      const lastInput = document.getElementById(`otp-${lastIndex}`);
      lastInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    
    if (otpCode.length !== 6) {
      setError('Vui lòng nhập đầy đủ 6 số');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/verify-otp', { otp: otpCode });
      
      if (response.data.success) {
        // Show success message
        alert('Xác thực email thành công! 🎉');
        // Redirect based on role
        const user = response.data.user;
        if (user?.role === 'admin') {
          router.push('/admin/dashboard');
        } else if (user?.role === 'instructor') {
          router.push('/instructor/dashboard');
        } else {
          router.push('/my-learning');
        }
      }
    } catch (err) {
      let errorMessage = 'Xác thực thất bại';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || 'Xác thực thất bại';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;

    setResending(true);
    setError('');

    try {
      const response = await api.post('/auth/resend-otp');
      
      if (response.data.success) {
        // Reset countdown
        setCountdown(60);
        setCanResend(false);
        alert('Mã OTP mới đã được gửi đến email của bạn! 📧');
      }
    } catch (err) {
      let errorMessage = 'Gửi lại thất bại';
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { error?: string } } };
        errorMessage = axiosError.response?.data?.error || 'Gửi lại thất bại';
      }
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-3xl font-bold text-gray-900">
            Xác thực Email
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Chúng tôi đã gửi mã OTP 6 số đến email
          </p>
          {email && (
            <p className="mt-1 text-sm font-medium text-blue-600">
              {email}
            </p>
          )}
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* OTP Inputs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
                Nhập mã OTP
              </label>
              <div className="flex justify-center gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xác thực...
                </span>
              ) : (
                'Xác thực'
              )}
            </button>

            {/* Resend OTP */}
            <div className="text-center">
              {!canResend ? (
                <p className="text-sm text-gray-600">
                  Gửi lại mã sau <span className="font-bold text-blue-600">{countdown}s</span>
                </p>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm font-medium text-blue-600 hover:text-blue-500 disabled:opacity-50"
                >
                  {resending ? 'Đang gửi...' : 'Gửi lại mã OTP'}
                </button>
              )}
            </div>
          </form>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-800">
              💡 <strong>Lưu ý:</strong> Mã OTP có hiệu lực trong 10 phút. 
              Nếu không nhận được email, kiểm tra thư mục Spam hoặc click "Gửi lại mã OTP".
            </p>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => router.push('/login')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Quay lại đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    }>
      <VerifyOTPContent />
    </Suspense>
  );
}

