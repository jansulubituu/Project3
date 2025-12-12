'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import PasswordRequirements from '@/components/auth/PasswordRequirements';
import { useAuth } from '@/contexts/AuthContext';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { isAuthenticated, logout } = useAuth();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showLogoutWarning, setShowLogoutWarning] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!token) {
      setError('Liên kết không hợp lệ hoặc đã hết hạn.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    // Check password requirements
    const hasLetter = /[A-Za-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    if (!hasLetter || !hasNumber) {
      setError('Mật khẩu phải có ít nhất 1 chữ cái và 1 số.');
      return;
    }

    try {
      setLoading(true);
      const res = await api.post(`/auth/reset-password/${token}`, { password });
      if (res.data?.success) {
        setMessage('Đặt lại mật khẩu thành công! Đang chuyển đến trang đăng nhập...');
        setTimeout(() => router.push('/login'), 1500);
      } else {
        setError(res.data?.error || 'Không thể đặt lại mật khẩu.');
      }
    } catch (err: any) {
      console.error('Reset password error:', err);
      const errorMessage = err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại.';
      setError(errorMessage);
      
      // If error is about logged in user trying to reset another account's password
      if (err.response?.status === 403 && errorMessage.includes('cannot reset password for another account')) {
        setShowLogoutWarning(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowLogoutWarning(false);
    setError('');
    // Reload page to clear state
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Đặt lại mật khẩu</h1>
            <p className="text-gray-600 mt-2">Nhập mật khẩu mới cho tài khoản của bạn.</p>
            {isAuthenticated && !showLogoutWarning && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
                ⚠️ Bạn đang đăng nhập. Chỉ có thể đặt lại mật khẩu cho tài khoản hiện tại.
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu mới</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
              <PasswordRequirements password={password} showAll={true} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhập lại mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <p className="font-semibold mb-1">{error}</p>
                {showLogoutWarning && (
                  <div className="mt-3 pt-3 border-t border-red-200">
                    <p className="mb-2">Bạn đang đăng nhập với tài khoản khác. Vui lòng đăng xuất trước khi đặt lại mật khẩu.</p>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors"
                    >
                      Đăng xuất ngay
                    </button>
                  </div>
                )}
              </div>
            )}
            {message && (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Đang đặt lại...' : 'Đặt lại mật khẩu'}
            </button>
          </form>

          <div className="text-center text-sm text-gray-600">
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

