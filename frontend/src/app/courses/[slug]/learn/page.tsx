'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';

interface Lesson {
  _id: string;
  title: string;
  order: number;
  progress?: {
    status: 'not_started' | 'in_progress' | 'completed';
    completedAt?: string;
  } | null;
}

interface Section {
  _id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

function LearnPageContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courseId, setCourseId] = useState<string | null>(null);

  useEffect(() => {
    const loadNextLesson = async () => {
      try {
        setLoading(true);
        setError('');

        // Get course by slug (API supports both ObjectId and slug)
        const courseResponse = await api.get(`/courses/${slug}`);
        if (!courseResponse.data.success || !courseResponse.data.course) {
          setError('Khóa học không tồn tại');
          setLoading(false);
          return;
        }

        const course = courseResponse.data.course;
        setCourseId(course._id);

        // Get curriculum with progress
        const curriculumResponse = await api.get(`/courses/${course._id}/curriculum`);
        
        if (!curriculumResponse.data.success) {
          setError('Không thể tải nội dung khóa học');
          setLoading(false);
          return;
        }

        const { sections, isEnrolled } = curriculumResponse.data;

        // Check if user is enrolled
        if (!isEnrolled) {
          router.push(`/courses/${slug}`);
          return;
        }

        // Flatten all lessons from all sections, sorted by order
        const allLessons: Lesson[] = [];
        sections.forEach((section: Section) => {
          section.lessons.forEach((lesson: Lesson) => {
            allLessons.push(lesson);
          });
        });

        // Sort lessons by order
        allLessons.sort((a, b) => a.order - b.order);

        if (allLessons.length === 0) {
          // No lessons available - show message
          setError('Chưa có bài học');
          setLoading(false);
          return;
        }

        // Find the next lesson to continue learning
        // Priority: in_progress > not_started > completed
        let nextLesson: Lesson | null = null;

        // First, try to find a lesson that is in_progress (currently learning)
        nextLesson = allLessons.find(
          (lesson) => lesson.progress?.status === 'in_progress'
        ) || null;

        // If no in_progress lesson, find the first not_started lesson
        if (!nextLesson) {
          nextLesson = allLessons.find(
            (lesson) => !lesson.progress || lesson.progress.status === 'not_started'
          ) || null;
        }

        // If still no lesson found, all lessons are completed
        // In that case, go to the first lesson (user can review)
        if (!nextLesson) {
          nextLesson = allLessons[0];
        }

        if (nextLesson) {
          // Redirect to the lesson
          router.push(`/courses/${slug}/learn/${nextLesson._id}`);
        } else {
          // This shouldn't happen, but handle it anyway
          setError('Không tìm thấy bài học');
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error('Error loading next lesson:', err);
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosError = err as {
            response?: {
              status?: number;
              data?: {
                message?: string;
              };
            };
          };
          
          if (axiosError.response?.status === 401) {
            router.push(`/login?redirect=/courses/${slug}/learn`);
            return;
          }
          
          setError(
            axiosError.response?.data?.message || 'Có lỗi xảy ra khi tải bài học'
          );
        } else {
          setError('Có lỗi xảy ra khi tải bài học');
        }
        setLoading(false);
      }
    };

    if (slug) {
      loadNextLesson();
    }
  }, [slug, router]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải bài học...</p>
        </div>
      </div>
    );
  }

  // Show error state (no lessons available)
  if (error || !courseId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Chưa có bài học'}
          </h2>
          <p className="text-gray-600 mb-6">
            Khóa học này hiện chưa có nội dung bài học nào.
          </p>
          <button
            onClick={() => router.push(`/courses/${slug}`)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Quay lại khóa học
          </button>
        </div>
      </div>
    );
  }

  // This shouldn't be reached, but just in case
  return null;
}

export default function LearnPage() {
  return (
    <ProtectedRoute>
      <LearnPageContent />
    </ProtectedRoute>
  );
}

