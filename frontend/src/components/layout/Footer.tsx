'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-8 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 sm:mb-4">🎓 EduLearn</h3>
            <p className="text-xs sm:text-sm">
              Nền tảng học trực tuyến hàng đầu với hàng ngàn khóa học chất lượng cao.
            </p>
          </div>

          {/* Khóa học */}
          <div>
            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Khóa học</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/courses" className="hover:text-white transition-colors">
                  Tất cả khóa học
                </Link>
              </li>
              <li>
                <Link href="/courses?level=beginner" className="hover:text-white transition-colors">
                  Khóa học cho người mới
                </Link>
              </li>
              <li>
                <Link href="/courses?level=advanced" className="hover:text-white transition-colors">
                  Khóa học nâng cao
                </Link>
              </li>
              <li>
                <Link href="/courses?sort=popular" className="hover:text-white transition-colors">
                  Khóa học phổ biến
                </Link>
              </li>
            </ul>
          </div>

          {/* Về chúng tôi */}
          <div>
            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Về chúng tôi</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/about" className="hover:text-white transition-colors">
                  Giới thiệu
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors">
                  Liên hệ
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/instructors" className="hover:text-white transition-colors">
                  Giảng viên
                </Link>
              </li>
            </ul>
          </div>

          {/* Hỗ trợ */}
          <div>
            <h4 className="font-semibold text-white mb-3 sm:mb-4 text-sm sm:text-base">Hỗ trợ</h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li>
                <Link href="/help" className="hover:text-white transition-colors">
                  Trung tâm trợ giúp
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">
                  Câu hỏi thường gặp
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors">
                  Điều khoản sử dụng
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800 text-center text-xs sm:text-sm">
          <p>&copy; 2024 EduLearn. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

