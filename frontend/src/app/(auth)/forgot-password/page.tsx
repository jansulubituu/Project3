'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    try {
      setLoading(true);
      await api.post('/auth/forgot-password', { email });
      setMessage('Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi.');
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setError(err.response?.data?.error || 'Có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-white shadow-md rounded-lg p-8 space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Quên mật khẩu</h1>
            <p className="text-gray-600 mt-2">
              Nhập email của bạn để nhận liên kết đặt lại mật khẩu.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
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
              {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại mật khẩu'}
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

