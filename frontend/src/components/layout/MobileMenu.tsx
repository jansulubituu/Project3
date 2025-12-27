'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import SearchBar from './SearchBar';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLinkClick = () => {
    onClose();
  };

  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50 md:hidden transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="p-4 border-b border-gray-200">
            <SearchBar onSearch={(query) => {
              handleLinkClick();
              window.location.href = `/courses?search=${encodeURIComponent(query)}`;
            }} />
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="flex flex-col space-y-1 px-4">
              <Link
                href="/"
                onClick={handleLinkClick}
                className={`px-4 py-3 rounded-lg transition-colors ${
                  isActive('/')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Trang chủ
              </Link>
              <Link
                href="/courses"
                onClick={handleLinkClick}
                className={`px-4 py-3 rounded-lg transition-colors ${
                  isActive('/courses')
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                Khóa học
              </Link>

              {isAuthenticated ? (
                <>
                  <div className="my-2 border-t border-gray-200" />
                  <Link
                    href={
                      user?.role === 'admin'
                        ? '/admin/dashboard'
                        : user?.role === 'instructor'
                        ? '/instructor/dashboard'
                        : '/dashboard'
                    }
                    onClick={handleLinkClick}
                    className={`px-4 py-3 rounded-lg transition-colors ${
                      isActive('/dashboard') || isActive('/admin/dashboard') || isActive('/instructor/dashboard')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/my-learning"
                    onClick={handleLinkClick}
                    className={`px-4 py-3 rounded-lg transition-colors ${
                      isActive('/my-learning')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Khóa học của tôi
                  </Link>
                  <Link
                    href="/profile"
                    onClick={handleLinkClick}
                    className={`px-4 py-3 rounded-lg transition-colors ${
                      isActive('/profile')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Hồ sơ
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      handleLinkClick();
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <div className="my-2 border-t border-gray-200" />
                  <Link
                    href="/login"
                    onClick={handleLinkClick}
                    className={`px-4 py-3 rounded-lg transition-colors ${
                      isActive('/login')
                        ? 'bg-blue-50 text-blue-600 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    onClick={handleLinkClick}
                    className="px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-center font-medium"
                  >
                    Đăng ký
                  </Link>
                </>
              )}
            </div>
          </nav>

          {/* Footer */}
          {isAuthenticated && user && (
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold">
                  {user.fullName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.fullName}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
