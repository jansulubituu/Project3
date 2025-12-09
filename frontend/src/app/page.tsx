'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { isValidImageUrl } from '@/lib/utils';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  courseCount: number;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnail: string;
  instructor: {
    _id: string;
    fullName: string;
    avatar: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  discountPrice?: number;
  level: string;
  averageRating: number;
  totalReviews: number;
  enrollmentCount: number;
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch categories
      const categoriesRes = await api.get('/categories?limit=6');
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.categories || []);
      }

      // Fetch featured courses
      const coursesRes = await api.get('/courses?limit=6&sort=popular');
      if (coursesRes.data.success) {
        setFeaturedCourses(coursesRes.data.courses || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-32">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 px-2">
              Học tập mọi lúc, mọi nơi
            </h1>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-blue-100 mb-6 sm:mb-8 max-w-3xl mx-auto px-4">
              Khám phá hàng ngàn khóa học chất lượng cao từ các giảng viên hàng đầu.
              Bắt đầu hành trình học tập của bạn ngay hôm nay!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
              {isAuthenticated ? (
                <>
                  <Link
                    href="/courses"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-50 transition-colors shadow-lg text-center"
                  >
                    Khám phá khóa học
                  </Link>
                  <Link
                    href="/dashboard"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-400 transition-colors border-2 border-white text-center"
                  >
                    Vào Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-50 transition-colors shadow-lg text-center"
                  >
                    Bắt đầu miễn phí
                  </Link>
                  <Link
                    href="/courses"
                    className="px-6 sm:px-8 py-3 sm:py-4 bg-blue-500 text-white rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-400 transition-colors border-2 border-white text-center"
                  >
                    Xem khóa học
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-gray-50 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">1000+</div>
              <div className="text-sm sm:text-base text-gray-600">Khóa học</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">50+</div>
              <div className="text-sm sm:text-base text-gray-600">Giảng viên</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">10K+</div>
              <div className="text-sm sm:text-base text-gray-600">Học viên</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-1 sm:mb-2">4.8★</div>
              <div className="text-sm sm:text-base text-gray-600">Đánh giá trung bình</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
              Tại sao chọn EduLearn?
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto px-4">
              Nền tảng học trực tuyến hiện đại với đầy đủ tính năng bạn cần
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4 sm:p-6">
              <div className="text-4xl sm:text-5xl mb-3 sm:mb-4">📚</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                Khóa học đa dạng
              </h3>
              <p className="text-sm sm:text-base text-gray-600">
                Hàng ngàn khóa học từ lập trình, thiết kế, marketing đến phát triển kỹ năng mềm
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🎯</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Học theo tốc độ của bạn
              </h3>
              <p className="text-gray-600">
                Học bất cứ lúc nào, bất cứ đâu. Theo dõi tiến độ và quay lại bất kỳ bài học nào
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">👨‍🏫</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Giảng viên chuyên nghiệp
              </h3>
              <p className="text-gray-600">
                Học từ các chuyên gia hàng đầu với nhiều năm kinh nghiệm trong lĩnh vực
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Hỗ trợ 24/7
              </h3>
              <p className="text-gray-600">
                Đội ngũ hỗ trợ luôn sẵn sàng giúp đỡ bạn trong suốt quá trình học tập
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">📱</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Học trên mọi thiết bị
              </h3>
              <p className="text-gray-600">
                Responsive design, học trên máy tính, tablet hoặc điện thoại
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-5xl mb-4">🏆</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Chứng chỉ hoàn thành
              </h3>
              <p className="text-gray-600">
                Nhận chứng chỉ sau khi hoàn thành khóa học để chứng minh kỹ năng của bạn
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="py-12 sm:py-16 lg:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
              Khám phá theo danh mục
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4">
              Tìm khóa học phù hợp với sở thích và mục tiêu của bạn
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : categories.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  href={`/categories/${category.slug}`}
                  className="bg-white rounded-lg shadow-md p-4 sm:p-6 text-center hover:shadow-lg transition-shadow group"
                >
                  <div className="text-3xl sm:text-4xl mb-2 sm:mb-3 group-hover:scale-110 transition-transform">
                    {category.icon || '📁'}
                  </div>
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">{category.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-500">{category.courseCount} khóa học</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
              Chưa có danh mục nào
            </div>
          )}
        </div>
      </section>

      {/* Featured Courses Section */}
      <section id="courses" className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-12 lg:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
              Khóa học nổi bật
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 px-4">
              Các khóa học được yêu thích nhất
            </p>
          </div>
          {loading ? (
            <div className="text-center py-8 sm:py-12">
              <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : featuredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {featuredCourses.map((course) => (
                <Link
                  key={course._id}
                  href={`/courses/${course.slug}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow group"
                >
                 <div className="relative h-40 sm:h-48 bg-gray-200">
                    {course.thumbnail ? (
                     <Image
                       src={course.thumbnail}
                       alt={course.title}
                       fill
                       className="object-cover group-hover:scale-105 transition-transform"
                      />
                     
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl sm:text-4xl">
                        📚
                      </div>
                    )}
                    <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                      <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded capitalize">
                        {course.level}
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-4 sm:p-6">
                    <div className="flex items-center mb-2">
                      <span className="text-yellow-500 text-xs sm:text-sm">★</span>
                      <span className="text-xs sm:text-sm text-gray-700 ml-1">
                        {course.averageRating.toFixed(1)} ({course.totalReviews})
                      </span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-gray-600 text-xs sm:text-sm mb-3 sm:mb-4 line-clamp-2">
                      {course.shortDescription}
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                      <div className="flex items-center space-x-2">
                        {course.instructor.avatar && isValidImageUrl(course.instructor.avatar) ? (
                          <Image
                            src={course.instructor.avatar}
                            alt={course.instructor.fullName}
                            width={32}
                            height={32}
                            className="rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                            {course.instructor.fullName.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs sm:text-sm text-gray-600 truncate">{course.instructor.fullName}</span>
                      </div>
                      <div className="text-left sm:text-right">
                        {course.discountPrice ? (
                          <>
                            <div className="text-base sm:text-lg font-bold text-blue-600">
                              {formatPrice(course.discountPrice)}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 line-through">
                              {formatPrice(course.price)}
                            </div>
                          </>
                        ) : (
                          <div className="text-base sm:text-lg font-bold text-blue-600">
                            {course.price === 0 ? 'Miễn phí' : formatPrice(course.price)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t text-xs sm:text-sm text-gray-500">
                      👥 {course.enrollmentCount} học viên
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 sm:py-12 text-gray-500 text-sm sm:text-base">
              Chưa có khóa học nào
            </div>
          )}
          <div className="text-center mt-8 sm:mt-12">
            <Link
              href="/courses"
              className="inline-block px-6 sm:px-8 py-2 sm:py-3 bg-blue-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-blue-700 transition-colors"
            >
              Xem tất cả khóa học
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-16 lg:py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 sm:mb-6 px-2">
            Sẵn sàng bắt đầu học tập?
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 px-4">
            Tham gia cùng hàng ngàn học viên đang học tập trên EduLearn
          </p>
          {!isAuthenticated && (
            <Link
              href="/register"
              className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-white text-blue-600 rounded-lg font-semibold text-base sm:text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Đăng ký miễn phí ngay
            </Link>
          )}
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}
