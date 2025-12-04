'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface Lesson {
  _id: string;
  title: string;
  description?: string;
  type: 'video' | 'article' | 'quiz' | 'assignment' | 'resource' | string;
  order: number;
  duration?: number;
  isFree: boolean;
  isPublished: boolean;
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

interface CourseMeta {
  _id: string;
  title: string;
  slug: string;
}

type LessonFormType = 'video' | 'article' | 'quiz';

interface SectionFormState {
  title: string;
  description: string;
  order: string;
}

interface LessonFormState {
  title: string;
  type: LessonFormType;
  isFree: boolean;
  description: string;
  videoUrl: string;
  videoDuration: string;
  articleContent: string;
}

function InstructorCourseLessonsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);

  // Lesson create
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formState, setFormState] = useState<LessonFormState>({
    title: '',
    type: 'video',
    isFree: false,
    description: '',
    videoUrl: '',
    videoDuration: '',
    articleContent: '',
  });
  const [videoSource, setVideoSource] = useState<'upload' | 'url'>('url');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  // Section create/edit
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionSubmitting, setSectionSubmitting] = useState(false);
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState<SectionFormState>({
    title: '',
    description: '',
    order: '',
  });

  // Lesson edit
  // Legacy inline edit state (no longer used since edit is on separate page)

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, curriculumRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/courses/${courseId}/curriculum`),
        ]);

        if (courseRes.data?.success) {
          const c = courseRes.data.course;
          setCourse({ _id: c._id, title: c.title, slug: c.slug });
        }

        if (curriculumRes.data?.success) {
          const secs = (curriculumRes.data.sections || []) as Section[];
          setSections(secs);
          if (secs.length > 0) {
            setSelectedSectionId(secs[0]._id);
          }
        }
      } catch (err) {
        console.error('Failed to load course lessons:', err);
        setError('Không thể tải danh sách bài học.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const handleOpenCreateLesson = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    setFormState({
      title: '',
      type: 'video',
      isFree: false,
      description: '',
      videoUrl: '',
      videoDuration: '',
      articleContent: '',
    });
    setFormError(null);
    setShowCreateModal(true);
  };

  const handleOpenCreateSection = () => {
    setEditingSection(null);
    setSectionFormError(null);
    setSectionForm({
      title: '',
      description: '',
      order: String(sections.length + 1),
    });
    setShowSectionModal(true);
  };

  const handleOpenEditSection = (section: Section) => {
    setEditingSection(section);
    setSectionFormError(null);
    setSectionForm({
      title: section.title,
      description: section.description || '',
      order: String(section.order ?? 1),
    });
    setShowSectionModal(true);
  };

  const handleSubmitSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      setSectionSubmitting(true);
      setSectionFormError(null);

      const payload: { title: string; description?: string; order?: number } = {
        title: sectionForm.title.trim(),
      };
      if (!payload.title) {
        setSectionFormError('Tiêu đề section là bắt buộc.');
        setSectionSubmitting(false);
        return;
      }
      const orderNum = Number(sectionForm.order);
      if (!Number.isNaN(orderNum) && orderNum > 0) {
        payload.order = orderNum;
      }
      if (sectionForm.description.trim()) {
        payload.description = sectionForm.description.trim();
      }

      if (editingSection) {
        const res = await api.put(`/sections/${editingSection._id}`, payload);
        if (!res.data?.success) {
          setSectionFormError(res.data?.message || 'Không thể cập nhật section.');
          setSectionSubmitting(false);
          return;
        }
      } else {
        const res = await api.post(`/courses/${courseId}/sections`, payload);
        if (!res.data?.success) {
          setSectionFormError(res.data?.message || 'Không thể tạo section mới.');
          setSectionSubmitting(false);
          return;
        }
      }

      const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
      if (curriculumRes.data?.success) {
        setSections(curriculumRes.data.sections || []);
      }

      setShowSectionModal(false);
    } catch (err) {
      console.error('Failed to save section:', err);
      let message = 'Không thể lưu section, vui lòng thử lại.';
      if (typeof err === 'object' && err !== null) {
        const anyErr = err as {
          response?: { data?: { errors?: { message?: string }[]; message?: string } };
        };
        const data = anyErr.response?.data;
        message = data?.errors?.[0]?.message || data?.message || message;
      }
      setSectionFormError(message);
    } finally {
      setSectionSubmitting(false);
    }
  };

  const handleDeleteSection = async (section: Section) => {
    if (!courseId) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa section "${section.title}"? Tất cả bài học trong section này cũng sẽ bị xóa.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/sections/${section._id}`);
      const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
      if (curriculumRes.data?.success) {
        setSections(curriculumRes.data.sections || []);
      }
    } catch (err) {
      console.error('Failed to delete section:', err);
      alert('Không thể xóa section. Vui lòng thử lại.');
    }
  };

  const handleSubmitCreateLesson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSectionId) return;

    try {
      setSubmitting(true);
      setFormError(null);

      const payload: {
        title: string;
        type: LessonFormType;
        isFree: boolean;
        description?: string;
        videoUrl?: string;
        videoDuration?: number;
        articleContent?: string;
        quizQuestions?: {
          question: string;
          type: string;
          options?: string[];
          correctAnswer?: string;
        }[];
      } = {
        title: formState.title.trim(),
        type: formState.type,
        isFree: formState.isFree,
        description: formState.description.trim() || undefined,
      };

      if (formState.type === 'video') {
        payload.videoUrl = formState.videoUrl.trim();
        if (formState.videoDuration) {
          const durationNum = Number(formState.videoDuration);
          if (!Number.isNaN(durationNum) && durationNum > 0) {
            payload.videoDuration = durationNum;
          }
        }
      } else if (formState.type === 'article') {
        payload.articleContent = formState.articleContent.trim();
      } else if (formState.type === 'quiz') {
        // Tạo quiz tối thiểu 1 câu hỏi mẫu, instructor có thể chỉnh sửa chi tiết ở trang edit sau
        payload.quizQuestions = [
          {
            question: 'Câu hỏi ví dụ',
            type: 'multiple_choice',
            options: ['A', 'B', 'C', 'D'],
            correctAnswer: 'A',
          },
        ];
      }

      if (!payload.title) {
        setFormError('Tiêu đề bài học là bắt buộc.');
        setSubmitting(false);
        return;
      }

      if (formState.type === 'video' && !payload.videoUrl) {
        setFormError('Video URL là bắt buộc với bài học video.');
        setSubmitting(false);
        return;
      }

      if (formState.type === 'article' && !payload.articleContent) {
        setFormError('Nội dung bài viết là bắt buộc với bài học article.');
        setSubmitting(false);
        return;
      }

      const res = await api.post(`/sections/${selectedSectionId}/lessons`, payload);
      if (res.data?.success) {
        // Refresh curriculum
        const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
        if (curriculumRes.data?.success) {
          setSections(curriculumRes.data.sections || []);
        }
        setShowCreateModal(false);
      } else {
        setFormError(res.data?.message || 'Không thể tạo bài học.');
      }
    } catch (err) {
      console.error('Failed to create lesson:', err);
      let message = 'Không thể tạo bài học, vui lòng thử lại.';
      if (typeof err === 'object' && err !== null) {
        const anyErr = err as {
          response?: { data?: { errors?: { message?: string }[]; message?: string } };
        };
        const data = anyErr.response?.data;
        message = data?.errors?.[0]?.message || data?.message || message;
      }
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const getLessonTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return 'Video';
      case 'article':
        return 'Bài viết';
      case 'quiz':
        return 'Quiz';
      case 'assignment':
        return 'Bài tập';
      case 'resource':
        return 'Tài nguyên';
      default:
        return type;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} phút`;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  };

  const handleDeleteLesson = async (lesson: Lesson) => {
    if (!courseId) return;
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa bài học "${lesson.title}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/lessons/${lesson._id}`);
      const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
      if (curriculumRes.data?.success) {
        setSections(curriculumRes.data.sections || []);
      }
    } catch (err) {
      console.error('Failed to delete lesson:', err);
      alert('Không thể xóa bài học. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải danh sách bài học...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải bài học</h2>
            <p className="text-gray-600 mb-4">{error || 'Bạn không có quyền hoặc khóa học không tồn tại.'}</p>
            <button
              type="button"
              onClick={() => router.push('/instructor/courses')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Quay lại danh sách khóa học
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">
                Quản lý bài học: {course.title}
              </h1>
              <p className="text-sm text-gray-600">
                Chia theo section, quản lý section và các loại bài học: video, bài viết, quiz...
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenCreateSection}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                + Thêm section
              </button>
              <button
                type="button"
                onClick={() => router.push(`/instructor/courses/${course._id}`)}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                ← Quay lại tổng quan khóa học
              </button>
            </div>
          </div>

          {/* Sections & lessons */}
          {sections.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-center text-gray-600">
              Khóa học chưa có section nào. Hãy thêm section trong trang chỉnh sửa khóa học trước.
            </div>
          ) : (
            <div className="space-y-4">
              {sections.map((section) => (
                <div key={section._id} className="bg-white rounded-lg shadow border border-gray-100">
                  <div className="px-5 py-4 flex items-start justify-between border-b">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        {section.order}. {section.title}
                      </h2>
                      {section.description && (
                        <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {section.lessons?.length || 0} bài học
                        {section.duration ? ` · ${formatDuration(section.duration)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenCreateLesson(section._id)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                      >
                        + Thêm bài học
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditSection(section)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Sửa section
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSection(section)}
                        className="inline-flex items-center px-3 py-1.5 rounded-md border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
                      >
                        Xóa section
                      </button>
                    </div>
                  </div>

                  {/* Lessons list */}
                  <div className="px-5 py-3">
                    {section.lessons.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Chưa có bài học trong section này.</p>
                    ) : (
                      <div className="divide-y">
                        {section.lessons
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((lesson) => (
                            <div key={lesson._id} className="py-3 flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-gray-500">{lesson.order}.</span>
                                  <span className="font-medium text-gray-900">{lesson.title}</span>
                                  <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-700">
                                    {getLessonTypeLabel(lesson.type)}
                                  </span>
                                  {lesson.isFree && (
                                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-xs text-green-700">
                                      Miễn phí
                                    </span>
                                  )}
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs ${
                                      lesson.isPublished
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-yellow-100 text-yellow-700'
                                    }`}
                                  >
                                    {lesson.isPublished ? 'Đã xuất bản' : 'Bản nháp'}
                                  </span>
                                </div>
                                {lesson.description && (
                                  <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                {lesson.duration && (
                                  <span className="text-gray-500">{formatDuration(lesson.duration)}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/courses/${course.slug}/learn/${lesson._id}`)
                                  }
                                  className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  Xem như học viên
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    router.push(`/instructor/lessons/${lesson._id}/edit`)
                                  }
                                  className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLesson(lesson)}
                                  className="px-3 py-1.5 rounded-md border border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Section create/edit modal */}
      {showSectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingSection ? 'Chỉnh sửa section' : 'Thêm section mới'}
              </h2>
              <button
                type="button"
                onClick={() => !sectionSubmitting && setShowSectionModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitSection} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề section
                </label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) =>
                    setSectionForm((s) => ({
                      ...s,
                      title: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Chương 1 - Giới thiệu"
                  disabled={sectionSubmitting}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (không bắt buộc)
                </label>
                <textarea
                  value={sectionForm.description}
                  onChange={(e) =>
                    setSectionForm((s) => ({
                      ...s,
                      description: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={sectionSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Thứ tự (số nguyên dương)
                </label>
                <input
                  type="number"
                  min={1}
                  value={sectionForm.order}
                  onChange={(e) =>
                    setSectionForm((s) => ({
                      ...s,
                      order: e.target.value,
                    }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={sectionSubmitting}
                />
              </div>

              {sectionFormError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {sectionFormError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !sectionSubmitting && setShowSectionModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={sectionSubmitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={sectionSubmitting}
                >
                  {sectionSubmitting
                    ? editingSection
                      ? 'Đang lưu...'
                      : 'Đang tạo...'
                    : editingSection
                    ? 'Lưu section'
                    : 'Tạo section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create lesson modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Thêm bài học mới</h2>
              <button
                type="button"
                onClick={() => !submitting && setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmitCreateLesson} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề bài học
                </label>
                <input
                  type="text"
                  value={formState.title}
                  onChange={(e) => setFormState((s) => ({ ...s, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Giới thiệu khóa học"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại bài học
                  </label>
                  <select
                    value={formState.type}
                    onChange={(e) =>
                      setFormState((s) => ({
                        ...s,
                        type: e.target.value as LessonFormType,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={submitting}
                  >
                    <option value="video">Video</option>
                    <option value="article">Bài viết</option>
                    <option value="quiz">Quiz</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="inline-flex items-center text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.isFree}
                      onChange={(e) =>
                        setFormState((s) => ({ ...s, isFree: e.target.checked }))
                      }
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                      disabled={submitting}
                    />
                    <span className="ml-2">Bài học miễn phí</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả ngắn (không bắt buộc)
                </label>
                <textarea
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((s) => ({ ...s, description: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  disabled={submitting}
                />
              </div>

              {/* Fields theo loại bài học */}
              {formState.type === 'video' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-4 items-center">
                    <span className="text-sm font-medium text-gray-700">Nguồn video:</span>
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input
                        type="radio"
                        name="createVideoSource"
                        value="url"
                        checked={videoSource === 'url'}
                        onChange={() => setVideoSource('url')}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                        disabled={submitting || videoUploading}
                      />
                      <span className="ml-2">Đường link (YouTube / URL khác)</span>
                    </label>
                    <label className="inline-flex items-center text-sm text-gray-700">
                      <input
                        type="radio"
                        name="createVideoSource"
                        value="upload"
                        checked={videoSource === 'upload'}
                        onChange={() => setVideoSource('upload')}
                        className="h-4 w-4 text-blue-600 border-gray-300"
                        disabled={submitting || videoUploading}
                      />
                      <span className="ml-2">Tải file video lên (tối đa 100MB)</span>
                    </label>
                  </div>

                  {videoSource === 'upload' && (
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="video/*"
                        disabled={submitting || videoUploading}
                        onChange={async (e) => {
                          if (!e.target.files || e.target.files.length === 0) return;
                          const file = e.target.files[0];
                          if (!file) return;
                          setVideoUploadError(null);
                          const maxSizeMb = 100;
                          if (file.size > maxSizeMb * 1024 * 1024) {
                            setVideoUploadError(
                              `Kích thước video phải nhỏ hơn hoặc bằng ${maxSizeMb}MB.`
                            );
                            e.target.value = '';
                            return;
                          }
                          try {
                            setVideoUploading(true);
                            const formData = new FormData();
                            formData.append('video', file);
                            const res = await api.post(
                              '/uploads/video?folder=edulearn/lesson-videos',
                              formData,
                              {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              }
                            );
                            if (res.data?.success && res.data.url) {
                              setFormState((s) => ({
                                ...s,
                                videoUrl: res.data.url as string,
                              }));
                            } else {
                              setVideoUploadError(
                                (res.data?.message as string) || 'Upload video thất bại.'
                              );
                            }
                          } catch (uploadErr: unknown) {
                            console.error('Failed to upload video:', uploadErr);
                            let message = 'Không thể upload video. Vui lòng thử lại.';
                            if (typeof uploadErr === 'object' && uploadErr !== null) {
                              const anyErr = uploadErr as {
                                response?: { data?: { message?: string; error?: string } };
                              };
                              const data = anyErr.response?.data;
                              message =
                                (data?.message as string | undefined) ||
                                (data?.error as string | undefined) ||
                                message;
                            }
                            setVideoUploadError(message);
                          } finally {
                            setVideoUploading(false);
                            e.target.value = '';
                          }
                        }}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {videoUploading && (
                        <p className="text-xs text-gray-500">Đang upload video, vui lòng đợi...</p>
                      )}
                      {videoUploadError && (
                        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                          {videoUploadError}
                        </p>
                      )}
                      {formState.videoUrl && (
                        <p className="text-xs text-gray-600 break-all">
                          Video hiện tại:{' '}
                          <span className="text-blue-700">{formState.videoUrl}</span>
                        </p>
                      )}
                    </div>
                  )}

                  {videoSource === 'url' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Video URL
                        </label>
                        <input
                          type="text"
                          value={formState.videoUrl}
                          onChange={(e) =>
                            setFormState((s) => ({ ...s, videoUrl: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="https://www.youtube.com/watch?... hoặc URL video trực tiếp"
                          disabled={submitting}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Thời lượng (phút)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={formState.videoDuration}
                          onChange={(e) =>
                            setFormState((s) => ({ ...s, videoDuration: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={submitting}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {formState.type === 'article' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nội dung bài viết
                  </label>
                  <textarea
                    value={formState.articleContent}
                    onChange={(e) =>
                      setFormState((s) => ({ ...s, articleContent: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={5}
                    disabled={submitting}
                  />
                </div>
              )}

              {formState.type === 'quiz' && (
                <div className="text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-300 rounded-md px-3 py-2">
                  Quiz sẽ được tạo với 1 câu hỏi mẫu. Bạn có thể chỉnh sửa chi tiết câu hỏi ở
                  trang edit bài học quiz sau này.
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !submitting && setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={submitting}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo bài học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function InstructorCourseLessonsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorCourseLessonsContent />
    </ProtectedRoute>
  );
}


