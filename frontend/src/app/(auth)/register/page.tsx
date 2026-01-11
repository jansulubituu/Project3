'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import ErrorMessage from '@/components/auth/ErrorMessage';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import { getAuthErrorMessage } from '@/lib/authErrorUtils';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student' as 'student' | 'instructor',
  });
  const [error, setError] = useState<{ message: string; type?: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error when user starts typing in the field with error
    if (error?.field === name) {
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (formData.password !== formData.confirmPassword) {
      setError({
        message: 'Mật khẩu xác nhận không khớp. Vui lòng kiểm tra lại.',
        type: 'validation',
        field: 'confirmPassword',
      });
      return;
    }

    if (formData.password.length < 6) {
      setError({
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
        type: 'validation',
        field: 'password',
      });
      return;
    }

    // Check password requirements
    const hasLetter = /[A-Za-z]/.test(formData.password);
    const hasNumber = /\d/.test(formData.password);
    
    if (!hasLetter || !hasNumber) {
      setError({
        message: 'Mật khẩu phải có ít nhất 1 chữ cái và 1 số.',
        type: 'validation',
        field: 'password',
      });
      return;
    }

    setLoading(true);

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });
    } catch (err) {
      const authError = getAuthErrorMessage(err);
      setError({
        message: authError.message,
        type: authError.type,
        field: authError.field,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} href="/" />
          </div>
          <p className="mt-2 text-lg text-gray-600">
            Tạo tài khoản mới
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <ErrorMessage
                error={error.message}
                type={error.type === 'validation' || error.type === 'auth' ? 'error' : error.type === 'warning' ? 'warning' : 'error'}
                onDismiss={() => setError(null)}
              />
            )}

            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
                Họ và tên
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'fullName' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Nguyễn Văn A"
                aria-invalid={error?.field === 'fullName' ? 'true' : 'false'}
                aria-describedby={error?.field === 'fullName' ? 'fullName-error' : undefined}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'email' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
                aria-invalid={error?.field === 'email' ? 'true' : 'false'}
                aria-describedby={error?.field === 'email' ? 'email-error' : undefined}
              />
            </div>

            {/* Role */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                Vai trò
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="student">Học viên</option>
                <option value="instructor">Giảng viên</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'password' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                aria-invalid={error?.field === 'password' ? 'true' : 'false'}
                aria-describedby={error?.field === 'password' ? 'password-error' : undefined}
              />
              <PasswordRequirements password={formData.password} showAll={true} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'confirmPassword' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                aria-invalid={error?.field === 'confirmPassword' ? 'true' : 'false'}
                aria-describedby={error?.field === 'confirmPassword' ? 'confirmPassword-error' : undefined}
              />
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="terms"
                type="checkbox"
                required
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mt-1"
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
                Tôi đồng ý với{' '}
                <Link href="/terms" className="text-blue-600 hover:text-blue-500">
                  Điều khoản dịch vụ
                </Link>
                {' '}và{' '}
                <Link href="/privacy" className="text-blue-600 hover:text-blue-500">
                  Chính sách bảo mật
                </Link>
              </label>
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
                  Đang đăng ký...
                </span>
              ) : (
                'Đăng ký'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <Link
                href="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Đăng nhập ngay
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          © 2024 EduLearn. All rights reserved.
        </p>
      </div>
    </div>
  );
}

