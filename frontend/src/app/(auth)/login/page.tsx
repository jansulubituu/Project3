'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import ErrorMessage from '@/components/auth/ErrorMessage';
import { getAuthErrorMessage } from '@/lib/authErrorUtils';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    // Restore preference from localStorage (only on client side)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rememberMe') === 'true';
    }
    return false;
  });
  const [error, setError] = useState<{ message: string; type?: string; field?: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      // Note: rememberMe preference is already saved in AuthContext.login()
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={true} href="/" />
          </div>
          <p className="mt-2 text-lg text-gray-600">
            Đăng nhập vào tài khoản của bạn
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

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error?.field === 'email') setError(null);
                }}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'email' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
                aria-invalid={error?.field === 'email' ? 'true' : 'false'}
                aria-describedby={error?.field === 'email' ? 'email-error' : undefined}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error?.field === 'password') setError(null);
                }}
                className={`mt-1 block w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  error?.field === 'password' ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                aria-invalid={error?.field === 'password' ? 'true' : 'false'}
                aria-describedby={error?.field === 'password' ? 'password-error' : undefined}
              />
            </div>

            {/* Forgot Password & Remember Me */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Remember Me */}
              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer transition-all hover:border-blue-400"
                />
                <label 
                  htmlFor="remember-me" 
                  className="ml-2 block text-sm font-medium text-gray-700 cursor-pointer select-none hover:text-gray-900 transition-colors"
                >
                  Ghi nhớ đăng nhập
                </label>
              </div>

              {/* Forgot Password Link */}
              <div className="flex items-center sm:justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1 py-0.5"
                >
                  Quên mật khẩu?
                </Link>
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
                  Đang đăng nhập...
                </span>
              ) : (
                'Đăng nhập'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Hoặc</span>
              </div>
            </div>
          </div>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Đăng ký ngay
              </Link>
            </p>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs font-semibold text-gray-700 mb-2">🔐 Tài khoản demo:</p>
            <div className="space-y-1 text-xs text-gray-600">
              <p>Student: <code className="bg-white px-1 py-0.5 rounded">student@edulearn.com</code> / <code className="bg-white px-1 py-0.5 rounded">Student123!</code></p>
              <p>Instructor: <code className="bg-white px-1 py-0.5 rounded">instructor@edulearn.com</code> / <code className="bg-white px-1 py-0.5 rounded">Instructor123!</code></p>
            </div>
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

