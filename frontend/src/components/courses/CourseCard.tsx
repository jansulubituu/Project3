'use client';

import Link from 'next/link';
import Image from 'next/image';
import { isValidImageUrl } from '@/lib/utils';

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
    headline?: string;
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
  totalDuration?: number;
  totalLessons?: number;
}

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}p` : `${hours}h`;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-200';
      case 'intermediate':
        return 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-yellow-200';
      case 'advanced':
        return 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-200';
      default:
        return 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-blue-200';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'Cơ bản';
      case 'intermediate':
        return 'Trung bình';
      case 'advanced':
        return 'Nâng cao';
      case 'all_levels':
        return 'Mọi cấp độ';
      default:
        return level;
    }
  };

  const discountPercent = course.discountPrice && course.price > 0
    ? Math.round(((course.price - course.discountPrice) / course.price) * 100)
    : 0;

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="group bg-white rounded-xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-blue-200 flex flex-col h-full"
      style={{ minHeight: '100%' }}
    >
      {/* Thumbnail Container */}
      <div className="relative h-48 sm:h-52 bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden">
        {course.thumbnail ? (
          <>
            <Image
              src={course.thumbnail}
              alt={course.title}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {/* Gradient Overlay on Hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <div className="text-6xl">📚</div>
          </div>
        )}
        
        {/* Badges Container */}
        <div className="absolute inset-0 p-3 sm:p-4 flex justify-between items-start pointer-events-none">
          {/* Discount Badge */}
          {discountPercent > 0 && (
            <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-1.5 rounded-lg shadow-lg transform group-hover:scale-105 transition-transform">
              <span className="text-sm font-bold">-{discountPercent}%</span>
            </div>
          )}
          
          {/* Level Badge */}
          <div className={`px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold ${getLevelColor(course.level)} transform group-hover:scale-105 transition-transform`}>
            {getLevelLabel(course.level)}
          </div>
        </div>

        {/* Category Badge - Bottom of Image */}
        <div className="absolute bottom-3 left-3 right-3">
          <span className="inline-block px-3 py-1 bg-white/90 backdrop-blur-sm text-blue-700 text-xs font-semibold rounded-full shadow-sm">
            {course.category.name}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 sm:p-6 flex-1 flex flex-col">
        {/* Title - Fixed height for alignment */}
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 leading-tight min-h-[3.5rem]">
          {course.title}
        </h3>

        {/* Description - Fixed height for alignment */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2 flex-shrink-0 min-h-[2.5rem]">
          {course.shortDescription}
        </p>

        {/* Instructor */}
        <div className="flex items-center space-x-2.5 mb-4 flex-shrink-0">
          {course.instructor.avatar && isValidImageUrl(course.instructor.avatar) ? (
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src={course.instructor.avatar}
                alt={course.instructor.fullName}
                fill
                className="rounded-full object-cover ring-2 ring-gray-100"
              />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ring-2 ring-gray-100">
              {course.instructor.fullName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {course.instructor.fullName}
            </p>
            {course.instructor.headline && (
              <p className="text-xs text-gray-500 truncate">
                {course.instructor.headline}
              </p>
            )}
          </div>
        </div>

        {/* Rating & Stats */}
        <div className="mb-4 pb-4 border-b border-gray-100 flex-shrink-0">
          {/* Rating - Fixed height */}
          <div className="flex items-center space-x-1.5 mb-3 min-h-[20px]">
            {course.averageRating > 0 && course.totalReviews > 0 ? (
              <>
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  <span className="text-sm font-bold text-gray-900 ml-1">
                    {course.averageRating.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  ({course.totalReviews} đánh giá)
                </span>
              </>
            ) : (
              <span className="text-xs text-gray-400">Chưa có đánh giá</span>
            )}
          </div>

          {/* Stats with labels - Fixed height for alignment */}
          <div className="grid grid-cols-3 gap-3 text-xs">
            {/* Enrollment Count */}
            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg min-h-[60px]">
              <div className="flex items-center space-x-1 mb-1 min-h-[20px]">
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-bold text-gray-900 whitespace-nowrap">{course.enrollmentCount || 0}</span>
              </div>
              <span className="text-gray-500 text-[10px] text-center">Học viên</span>
            </div>

            {/* Total Lessons */}
            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg min-h-[60px]">
              <div className="flex items-center space-x-1 mb-1 min-h-[20px]">
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <span className="font-bold text-gray-900 whitespace-nowrap">{course.totalLessons || 0}</span>
              </div>
              <span className="text-gray-500 text-[10px] text-center">Bài học</span>
            </div>

            {/* Duration - Fixed width to prevent layout shift */}
            <div className="flex flex-col items-center justify-center p-2 bg-gray-50 rounded-lg min-h-[60px]">
              <div className="flex items-center space-x-1 mb-1 min-h-[20px]">
                <svg className="w-4 h-4 text-gray-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-bold text-gray-900 text-center min-w-[45px]">
                  {course.totalDuration && course.totalDuration > 0 ? formatDuration(course.totalDuration) : '0 phút'}
                </span>
              </div>
              <span className="text-gray-500 text-[10px] text-center">Thời lượng</span>
            </div>
          </div>
        </div>

        {/* Price & CTA */}
        <div className="mt-auto pt-2">
          <div className="flex items-center justify-between">
            <div>
              {discountPercent > 0 ? (
                <>
                  <div className="text-xl font-bold text-blue-600">
                    {formatPrice(course.discountPrice!)}
                  </div>
                  <div className="text-sm text-gray-400 line-through">
                    {formatPrice(course.price)}
                  </div>
                </>
              ) : (
                <div className="text-xl font-bold text-blue-600">
                  {course.price === 0 ? (
                    <span className="text-green-600">Miễn phí</span>
                  ) : (
                    formatPrice(course.price)
                  )}
                </div>
              )}
            </div>
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-105">
              Xem ngay →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

