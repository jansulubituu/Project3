'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import SearchBar from './SearchBar';
import NotificationBell from './NotificationBell';
import MobileMenu from './MobileMenu';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const getDashboardPath = () => {
    if (user?.role === 'admin') return '/admin/dashboard';
    if (user?.role === 'instructor') return '/instructor/dashboard';
    return '/my-learning';
  };

  const getRoleBadge = () => {
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'instructor') return 'Giảng viên';
    return 'Học viên';
  };

  const getRoleBadgeColor = () => {
    if (user?.role === 'admin') return 'bg-red-100 text-red-700';
    if (user?.role === 'instructor') return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <>
      <header
        ref={headerRef}
        className={`sticky top-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-md'
            : 'bg-white shadow-sm'
        }`}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  EduLearn
                </span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center flex-1 max-w-2xl mx-8">
              <SearchBar className="flex-1" />
            </div>

            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {isAuthenticated ? (
                <>
                  <NotificationBell className="ml-2" />
                  
                  {/* User Dropdown */}
                  <div className="relative ml-2">
                    <button
                      onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                      className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Avatar src={user?.avatar} name={user?.fullName} size="sm" />
                      <span className="hidden lg:block text-sm font-medium text-gray-700 max-w-[120px] truncate">
                        {user?.fullName || 'User'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${
                          userDropdownOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    <Dropdown
                      isOpen={userDropdownOpen}
                      onClose={() => setUserDropdownOpen(false)}
                      align="right"
                      className="w-64"
                    >
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center space-x-3">
                          <Avatar src={user?.avatar} name={user?.fullName} size="md" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate">
                              {user?.fullName || 'User'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                            <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${getRoleBadgeColor()}`}>
                              {getRoleBadge()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        {/* Dashboard - chỉ hiển thị cho admin và instructor */}
                        {(user?.role === 'admin' || user?.role === 'instructor') && (
                          <Link
                            href={getDashboardPath()}
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                            Dashboard
                          </Link>
                        )}
                        {/* Khóa học của tôi - chỉ hiển thị cho student */}
                        {user?.role === 'student' && (
                          <Link
                            href="/my-learning"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                            Khóa học của tôi
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Hồ sơ
                        </Link>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => {
                            logout();
                            setUserDropdownOpen(false);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Đăng xuất
                        </button>
                      </div>
                    </Dropdown>
                  </div>
                </>
              ) : (
                <div className="hidden md:flex items-center space-x-3 lg:space-x-4 ml-2">
                  <Link
                    href="/login"
                    className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors font-medium"
                  >
                    Đăng nhập
                  </Link>
                  <Link
                    href="/register"
                    className="px-3 lg:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all text-sm lg:text-base font-medium shadow-md hover:shadow-lg"
                  >
                    Đăng ký
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <MobileMenu isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}
