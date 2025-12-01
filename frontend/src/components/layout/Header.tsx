'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-xl sm:text-2xl font-bold text-gray-900">
              🎓 EduLearn
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link
              href="/"
              className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors"
            >
              Trang chủ
            </Link>
            <Link
              href="/courses"
              className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors"
            >
              Khóa học
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Hồ sơ
                </Link>
                <button
                  onClick={logout}
                  className="text-sm lg:text-base text-gray-700 hover:text-red-600 transition-colors"
                >
                  Đăng xuất
                </button>
                <Link
                  href="/profile"
                  className="px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
                >
                  {user?.fullName || 'Profile'}
                </Link>
              </>
            ) : (
              <div className="flex items-center space-x-3 lg:space-x-4">
                <Link
                  href="/login"
                  className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Đăng nhập
                </Link>
                <Link
                  href="/register"
                  className="px-3 lg:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm lg:text-base"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col space-y-3">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600 transition-colors px-2 py-1"
              >
                Trang chủ
              </Link>
              <Link
                href="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className="text-gray-700 hover:text-blue-600 transition-colors px-2 py-1"
              >
                Khóa học
              </Link>
              {isAuthenticated ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-blue-600 transition-colors px-2 py-1"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-blue-600 transition-colors px-2 py-1"
                  >
                    Hồ sơ
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="text-left text-gray-700 hover:text-red-600 transition-colors px-2 py-1"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-gray-700 hover:text-blue-600 transition-colors px-2 py-1"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-2"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}

