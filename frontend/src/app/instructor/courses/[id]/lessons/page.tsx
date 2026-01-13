'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';

/**
 * Redirect page: Lessons management has been integrated into Curriculum page
 * This page redirects to the unified curriculum management page
 */
function LessonsRedirect() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  useEffect(() => {
    if (courseId) {
      router.replace(`/instructor/courses/${courseId}/curriculum`);
    }
  }, [courseId, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Đang chuyển hướng...</p>
      </div>
    </div>
  );
}

export default function InstructorCourseLessonsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <LessonsRedirect />
    </ProtectedRoute>
  );
}
