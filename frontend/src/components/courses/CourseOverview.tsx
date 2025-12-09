'use client';

import Image from 'next/image';
import { isValidImageUrl } from '@/lib/utils';

interface Course {
  _id: string;
  description: string;
  requirements?: string[];
  learningOutcomes?: string[];
  instructor: {
    _id: string;
    fullName: string;
    avatar: string;
    headline?: string;
    bio?: string;
    website?: string;
    social?: {
      linkedin?: string;
      twitter?: string;
      youtube?: string;
    };
  };
  category: {
    name: string;
  };
  tags?: string[];
  language?: string;
  createdAt: string;
}

interface CourseOverviewProps {
  course: Course;
  isEnrolled: boolean;
}

export default function CourseOverview({ course }: CourseOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Description */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Mô tả khóa học</h2>
          <div
            className="prose max-w-none text-gray-700 whitespace-pre-line"
            dangerouslySetInnerHTML={{ __html: course.description }}
          />
        </div>

        {/* Learning Outcomes */}
        {course.learningOutcomes && course.learningOutcomes.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bạn sẽ học được gì</h2>
            <ul className="space-y-3">
              {course.learningOutcomes.map((outcome, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-green-500 mr-3 mt-1">✓</span>
                  <span className="text-gray-700">{outcome}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements */}
        {course.requirements && course.requirements.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Yêu cầu</h2>
            <ul className="space-y-2 list-disc list-inside text-gray-700">
              {course.requirements.map((requirement, index) => (
                <li key={index}>{requirement}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {course.tags && course.tags.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Thẻ</h2>
            <div className="flex flex-wrap gap-2">
              {course.tags.map((tag, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Instructor Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Giảng viên</h3>
          <div className="flex items-start space-x-4">
            {course.instructor.avatar && isValidImageUrl(course.instructor.avatar) ? (
              <Image
                src={course.instructor.avatar}
                alt={course.instructor.fullName}
                width={64}
                height={64}
                className="rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl font-semibold flex-shrink-0">
                {course.instructor.fullName.charAt(0)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900">{course.instructor.fullName}</h4>
              {course.instructor.headline && (
                <p className="text-sm text-gray-600 mt-1">{course.instructor.headline}</p>
              )}
              {course.instructor.bio && (
                <p className="text-sm text-gray-600 mt-2 line-clamp-3">{course.instructor.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Course Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Thông tin khóa học</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Danh mục</dt>
              <dd className="text-sm text-gray-900 mt-1">{course.category.name}</dd>
            </div>
            {course.language && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ngôn ngữ</dt>
                <dd className="text-sm text-gray-900 mt-1">{course.language}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Ngày tạo</dt>
              <dd className="text-sm text-gray-900 mt-1">
                {new Date(course.createdAt).toLocaleDateString('vi-VN')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

