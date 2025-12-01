'use client';

import Link from 'next/link';
import Image from 'next/image';

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

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
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

  return (
    <Link
      href={`/courses/${course.slug}`}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
    >
      {/* Thumbnail */}
      <div className="relative h-40 sm:h-48 bg-gray-200">
        {course.thumbnail ? (
          <Image
            src={course.thumbnail}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl sm:text-4xl">
            📚
          </div>
        )}
        {/* Level Badge */}
        <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
          <span
            className={`px-2 py-1 text-xs font-semibold rounded capitalize ${getLevelColor(
              course.level
            )}`}
          >
            {getLevelLabel(course.level)}
          </span>
        </div>
        {/* Discount Badge */}
        {course.discountPrice && course.discountPrice < course.price && (
          <div className="absolute top-2 sm:top-4 left-2 sm:left-4">
            <span className="px-2 py-1 bg-red-600 text-white text-xs font-semibold rounded">
              -{Math.round(((course.price - course.discountPrice) / course.price) * 100)}%
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Category */}
        <div className="mb-2">
          <span className="text-xs sm:text-sm text-blue-600 font-medium">
            {course.category.name}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3.5rem]">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 line-clamp-2">
          {course.shortDescription}
        </p>

        {/* Instructor */}
        <div className="flex items-center space-x-2 mb-3 sm:mb-4">
          {course.instructor.avatar ? (
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
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {course.instructor.fullName}
            </p>
          </div>
        </div>

        {/* Rating & Reviews */}
        <div className="flex items-center mb-3 sm:mb-4">
          <div className="flex items-center">
            <span className="text-yellow-500 text-xs sm:text-sm">★</span>
            <span className="text-xs sm:text-sm font-semibold text-gray-900 ml-1">
              {course.averageRating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs sm:text-sm text-gray-500 ml-2">
            ({course.totalReviews} đánh giá)
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b">
          <div className="flex items-center space-x-1">
            <span>👥</span>
            <span>{course.enrollmentCount} học viên</span>
          </div>
          {course.totalLessons && (
            <div className="flex items-center space-x-1">
              <span>📚</span>
              <span>{course.totalLessons} bài học</span>
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div>
            {course.discountPrice && course.discountPrice < course.price ? (
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
      </div>
    </Link>
  );
}

