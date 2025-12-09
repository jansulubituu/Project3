'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  type: string;
  order: number;
  duration?: number;
  isFree: boolean;
  isPublished: boolean;
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string;
  } | null;
}

interface Section {
  _id: string;
  title: string;
  description?: string;
  order: number;
  duration?: number;
  lessonCount?: number;
  lessons: Lesson[];
}

interface CourseCurriculumProps {
  courseId: string;
  courseSlug: string;
  isEnrolled: boolean;
}

export default function CourseCurriculum({
  courseId,
  courseSlug,
  isEnrolled,
}: CourseCurriculumProps) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCurriculum();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, isEnrolled]);

  const fetchCurriculum = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/courses/${courseId}/curriculum`);
      if (response.data.success) {
        setSections(response.data.sections || []);
        // Expand first section by default
        if (response.data.sections && response.data.sections.length > 0) {
          setExpandedSections(new Set([response.data.sections[0]._id]));
        }
      }
    } catch (error) {
      console.error('Failed to fetch curriculum:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} phút`;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '▶️';
      case 'article':
        return '📄';
      case 'quiz':
        return '❓';
      case 'assignment':
        return '📝';
      case 'resource':
        return '📎';
      default:
        return '📚';
    }
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (!isEnrolled && !lesson.isFree) {
      if (!isAuthenticated) {
        router.push(`/login?redirect=/courses/${courseSlug}`);
      } else {
        // Show enrollment prompt
        alert('Vui lòng đăng ký khóa học để xem bài học này');
      }
      return;
    }
    router.push(`/courses/${courseSlug}/learn/${lesson._id}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải nội dung...</p>
        </div>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600 text-center py-8">Chưa có nội dung khóa học</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Nội dung khóa học</h2>
            <p className="text-sm text-gray-600 mt-1">
              {sections.reduce((total, section) => total + (section.lessons?.length || 0), 0)} bài học
              {isEnrolled && (
                <span className="ml-2 text-blue-600 font-medium">
                  (Tiến độ của bạn được hiển thị bên dưới)
                </span>
              )}
            </p>
          </div>
          {!isEnrolled && (
            <div className="text-sm text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
              💡 Đăng ký để xem tất cả bài học
            </div>
          )}
        </div>
      </div>

      {/* Sections */}
      <div className="divide-y">
        {sections.map((section) => {
          const isExpanded = expandedSections.has(section._id);
          const freeLessons = section.lessons?.filter((l) => l.isFree) || [];
          const lockedLessons = section.lessons?.filter((l) => !l.isFree && !isEnrolled) || [];
          const availableLessons = isEnrolled
            ? section.lessons || []
            : freeLessons;

          return (
            <div key={section._id} className="border-b last:border-b-0">
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section._id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-semibold text-gray-900">
                      {section.order}. {section.title}
                    </span>
                    {section.description && (
                      <span className="text-sm text-gray-500">- {section.description}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <span>{section.lessons?.length || 0} bài học</span>
                    {section.duration && <span>{formatDuration(section.duration)}</span>}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    isExpanded ? 'transform rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {/* Section Lessons */}
              {isExpanded && (
                <div className="px-6 pb-4 bg-gray-50">
                  <div className="space-y-1">
                    {availableLessons.map((lesson) => (
                      <button
                        key={lesson._id}
                        onClick={() => handleLessonClick(lesson)}
                        className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-white transition-colors text-left group"
                      >
                        <span className="text-lg">{getLessonIcon(lesson.type)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900 group-hover:text-blue-600">
                              {lesson.order}. {lesson.title}
                            </span>
                            {lesson.isFree && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                Miễn phí
                              </span>
                            )}
                            {isEnrolled && lesson.progress && (
                              <>
                                {lesson.progress.status === 'completed' && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded flex items-center">
                                    ✓ Hoàn thành
                                  </span>
                                )}
                                {lesson.progress.status === 'in_progress' && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                    Đang học
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                          {lesson.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                              {lesson.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          {lesson.duration && <span>{formatDuration(lesson.duration)}</span>}
                          <svg
                            className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </button>
                    ))}

                    {/* Locked Lessons Preview */}
                    {!isEnrolled && lockedLessons.length > 0 && (
                      <>
                        {lockedLessons.slice(0, 2).map((lesson) => (
                          <div
                            key={lesson._id}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg bg-gray-100 opacity-60"
                          >
                            <span className="text-lg">{getLessonIcon(lesson.type)}</span>
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-600">
                                  {lesson.order}. {lesson.title}
                                </span>
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                  🔒
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        {lockedLessons.length > 2 && (
                          <div className="px-4 py-2 text-sm text-gray-500 text-center">
                            +{lockedLessons.length - 2} bài học khác (đăng ký để xem)
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Enrollment CTA */}
      {!isEnrolled && (
        <div className="p-6 bg-blue-50 border-t">
          <div className="text-center">
            <p className="text-gray-700 mb-3">
              Đăng ký ngay để xem tất cả {sections.reduce((total, section) => total + (section.lessons?.length || 0), 0)} bài học
            </p>
            <Link
              href={`/courses/${courseSlug}`}
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Đăng ký khóa học
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

