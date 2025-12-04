'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle,
  FileText,
  List,
  Loader2,
  PlayCircle,
  ShieldAlert,
} from 'lucide-react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

interface LessonAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
}

interface LessonSection {
  _id: string;
  title: string;
  description?: string;
  order: number;
  lessons: LessonListItem[];
}

interface LessonListItem {
  _id: string;
  title: string;
  type: string;
  order: number;
  duration?: number;
  isFree: boolean;
  isPublished: boolean;
}

interface LessonDetail extends LessonListItem {
  description?: string;
  videoUrl?: string;
  videoProvider?: string;
  videoDuration?: number;
  articleContent?: string;
  quizQuestions?: {
    question: string;
    type: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
  }[];
  attachments?: LessonAttachment[];
  section: {
    _id: string;
    title: string;
  } | string;
  updatedAt?: string;
}

interface CourseSummary {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  instructor?: {
    _id: string;
    fullName: string;
    avatar?: string;
  };
}

type ProgressStatus = 'not_started' | 'in_progress' | 'completed';

interface LessonProgress {
  status: ProgressStatus;
  lastPosition?: number;
  timeSpent?: number;
  updatedAt?: string;
}

const lessonTypeIcon = (type?: string) => {
  switch (type) {
    case 'video':
      return <PlayCircle className="h-4 w-4" />;
    case 'article':
      return <FileText className="h-4 w-4" />;
    case 'quiz':
      return <BookOpen className="h-4 w-4" />;
    default:
      return <List className="h-4 w-4" />;
  }
};

const formatMinutes = (minutes?: number) => {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}p` : `${hours} giờ`;
};

const formatDateTime = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
};

export default function LessonPageWrapper() {
  return (
    <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
      <LessonPage />
    </ProtectedRoute>
  );
}

function LessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [sections, setSections] = useState<LessonSection[]>([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [progress, setProgress] = useState<LessonProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [markingComplete, setMarkingComplete] = useState(false);

  useEffect(() => {
    if (!slug || !lessonId) return;
    const controller = new AbortController();
    loadPageData(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, lessonId]);

  const loadPageData = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const coursePromise = api.get(`/courses/${slug}`, { signal });
      const lessonPromise = api.get(`/lessons/${lessonId}`, { signal });

      const [courseResponse, lessonResponse] = await Promise.all([coursePromise, lessonPromise]);

      if (!courseResponse.data?.success || !lessonResponse.data?.success) {
        throw new Error('Không thể tải dữ liệu bài học');
      }

      setCourse(courseResponse.data.course);
      setIsEnrolled(courseResponse.data.isEnrolled || false);

      const lessonData: LessonDetail = lessonResponse.data.lesson || lessonResponse.data.data || lessonResponse.data;
      setLesson(lessonData);
      setProgress(
        lessonResponse.data.progress || lessonResponse.data.lessonProgress || {
          status: 'not_started',
        }
      );

      const courseId = courseResponse.data.course?._id;
      if (courseId) {
        const curriculumRes = await api.get(`/courses/${courseId}/curriculum`, { signal });
        if (curriculumRes.data?.success) {
          setSections(curriculumRes.data.sections || []);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === 'CanceledError') return;
      console.error('Failed to load lesson page:', err);
      setError('Không thể tải dữ liệu bài học. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };

  const flattenedLessons = useMemo(() => {
    return sections.flatMap((section) =>
      section.lessons.map((ls) => ({
        ...ls,
        sectionId: section._id,
        sectionTitle: section.title,
      }))
    );
  }, [sections]);

  const currentIndex = useMemo(() => {
    if (!lesson) return -1;
    return flattenedLessons.findIndex((item) => item._id === lesson._id);
  }, [flattenedLessons, lesson]);

  const previousLesson = currentIndex > 0 ? flattenedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < flattenedLessons.length - 1 ? flattenedLessons[currentIndex + 1] : null;

  const handleNavigateLesson = useCallback(
    (targetLessonId?: string, isLocked?: boolean) => {
      if (!targetLessonId || isLocked) return;
      router.push(`/courses/${slug}/learn/${targetLessonId}`);
      window.scrollTo({ top: 0 });
    },
    [router, slug]
  );

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setMarkingComplete(true);
    setActionMessage(null);
    setActionError(null);

    try {
      const response = await api.post(`/progress/lesson/${lesson._id}/complete`);
      if (response.data?.success) {
        setProgress({
          status: 'completed',
          updatedAt: new Date().toISOString(),
        });
        setActionMessage('Đã đánh dấu hoàn thành bài học!');
      }
    } catch (err) {
      console.error('Failed to mark lesson complete:', err);
      setActionError('Không thể cập nhật tiến độ. Vui lòng thử lại.');
    } finally {
      setMarkingComplete(false);
    }
  };

  const isLessonLocked =
    lesson &&
    !lesson.isFree &&
    !isEnrolled &&
    course?.instructor?._id !== user?.id &&
    user?.role !== 'admin';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-gray-600">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>Đang tải bài học...</p>
        </div>
      </div>
    );
  }

  if (error || !course || !lesson) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="max-w-md">
          <ShieldAlert className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Không thể mở bài học</h1>
          <p className="text-gray-600 mb-6">{error || 'Bài học không tồn tại hoặc bạn không có quyền truy cập.'}</p>
          <Link
            href={`/courses/${slug}`}
            className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-3 text-white font-medium hover:bg-blue-700"
          >
            Quay lại khóa học
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          } fixed md:static inset-y-0 z-30 w-80 bg-white border-r border-gray-200 shadow-lg md:shadow-none transition-transform duration-200 ease-out`}
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-4 border-b">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Khóa học</p>
              <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
              <Link href={`/courses/${slug}`} className="text-sm text-blue-600 hover:underline">
                ⟵ Xem chi tiết khóa học
              </Link>
            </div>

            <div className="flex-1 overflow-y-auto">
              {sections.map((section) => (
                <LessonSectionBlock
                  key={section._id}
                  section={section}
                  currentLessonId={lesson._id}
                  isEnrolled={isEnrolled}
                  onNavigate={handleNavigateLesson}
                />
              ))}
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="md:hidden fixed inset-0 bg-black/30 z-20"
            onClick={() => setSidebarOpen(false)}
            role="presentation"
          />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col">
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                aria-label="Toggle sidebar"
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-600"
              >
                <List className="h-5 w-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">Bài học hiện tại</p>
                <h1 className="text-xl font-semibold text-gray-900">{lesson.title}</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {progress?.status === 'completed' && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <CheckCircle className="h-3.5 w-3.5 mr-1" /> Đã hoàn thành
                </span>
              )}
              <span className="hidden sm:inline text-sm text-gray-500">{formatMinutes(lesson.duration)}</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
            {isLessonLocked ? (
              <LockedLessonCTA slug={slug} />
            ) : (
              <>
                <LessonContent lesson={lesson} />

                <LessonSummary lesson={lesson} />

                {lesson.attachments && lesson.attachments.length > 0 && (
                  <LessonAttachments attachments={lesson.attachments} />
                )}

                {lesson.type === 'quiz' && lesson.quizQuestions && (
                  <LessonQuiz
                    lessonId={lesson._id}
                    questions={lesson.quizQuestions}
                    progress={progress}
                    onProgressUpdate={setProgress}
                  />
                )}

                <LessonActions
                  progress={progress}
                  canComplete={isEnrolled && user?.role === 'student'}
                  onMarkComplete={handleMarkComplete}
                  markingComplete={markingComplete}
                  actionMessage={actionMessage}
                  actionError={actionError}
                />
              </>
            )}

            <LessonNavigator
              previousLesson={previousLesson}
              nextLesson={nextLesson}
              slug={slug}
              onNavigate={handleNavigateLesson}
              isEnrolled={isEnrolled}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function LessonSectionBlock({
  section,
  currentLessonId,
  isEnrolled,
  onNavigate,
}: {
  section: LessonSection;
  currentLessonId: string;
  isEnrolled: boolean;
  onNavigate: (lessonId?: string, locked?: boolean) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
      >
        <div>
          <p className="text-sm font-semibold text-gray-900">{section.title}</p>
          {section.description && <p className="text-xs text-gray-500">{section.description}</p>}
        </div>
        <svg
          className={`h-4 w-4 text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="divide-y">
          {section.lessons.map((lesson) => {
            const isCurrent = lesson._id === currentLessonId;
            const isLocked = !isEnrolled && !lesson.isFree;
            return (
              <button
                key={lesson._id}
                onClick={() => onNavigate(lesson._id, isLocked)}
                disabled={isLocked}
                className={`w-full px-4 py-3 flex items-start gap-3 text-left hover:bg-gray-50 ${
                  isLocked ? 'cursor-not-allowed opacity-60' : ''
                } ${isCurrent ? 'bg-blue-50' : ''}`}
              >
                <span
                  className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ${
                    lesson.type === 'video' ? 'bg-blue-500' : 'bg-gray-400'
                  }`}
                >
                  {lessonTypeIcon(lesson.type)}
                </span>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}>{lesson.title}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    <span># {lesson.order}</span>
                    <span>{formatMinutes(lesson.duration)}</span>
                    {lesson.isFree && <span className="text-green-600 font-semibold">Miễn phí</span>}
                    {isLocked && <span className="text-gray-400">🔒 Khóa</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LessonContent({ lesson }: { lesson: LessonDetail }) {
  if (lesson.type === 'video' && lesson.videoUrl) {
    return (
      <div className="bg-black rounded-2xl shadow overflow-hidden">
        <video controls controlsList="nodownload" className="w-full aspect-video">
          <source src={lesson.videoUrl} />
        </video>
      </div>
    );
  }

  if (lesson.type === 'article' && lesson.articleContent) {
    return (
      <article className="bg-white rounded-2xl shadow p-6 prose max-w-none prose-h2:mt-6 prose-h2:text-2xl prose-p:text-gray-700">
        <div dangerouslySetInnerHTML={{ __html: lesson.articleContent }} />
      </article>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 text-center text-gray-500">
      Nội dung bài học sẽ được hiển thị tại đây.
    </div>
  );
}

function LessonSummary({ lesson }: { lesson: LessonDetail }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Tổng quan bài học</h3>
      {lesson.description && <p className="text-gray-600">{lesson.description}</p>}
      <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
        <div>
          <dt className="uppercase text-xs tracking-wide text-gray-400">Thời lượng</dt>
          <dd className="text-gray-900 font-medium">{formatMinutes(lesson.duration)}</dd>
        </div>
        <div>
          <dt className="uppercase text-xs tracking-wide text-gray-400">Loại nội dung</dt>
          <dd className="text-gray-900 font-medium capitalize">{lesson.type}</dd>
        </div>
        <div>
          <dt className="uppercase text-xs tracking-wide text-gray-400">Cập nhật</dt>
          <dd className="text-gray-900 font-medium">{formatDateTime(lesson.updatedAt)}</dd>
        </div>
      </dl>
    </div>
  );
}

function LessonAttachments({ attachments }: { attachments: LessonAttachment[] }) {
  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Tài liệu đính kèm</h3>
      <div className="space-y-3">
        {attachments.map((file) => (
          <a
            key={file.url}
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 hover:border-blue-500 hover:bg-blue-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {file.type || 'Tài liệu'} · {file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'không rõ dung lượng'}
              </p>
            </div>
            <span className="text-sm font-semibold text-blue-600">Tải xuống</span>
          </a>
        ))}
      </div>
    </div>
  );
}

function LessonQuiz({
  lessonId,
  questions,
  progress,
  onProgressUpdate,
}: {
  lessonId: string;
  questions: NonNullable<LessonDetail['quizQuestions']>;
  progress: LessonProgress | null;
  onProgressUpdate: (progress: LessonProgress | null) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!questions?.length) return null;

  const handleChange = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [String(index)]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const payload = {
        status: 'in_progress' as const,
        answers: questions.map((_q, index) => ({
          questionId: String(index),
          answer: answers[String(index)] ?? '',
        })),
      };

      const response = await api.put(`/progress/lesson/${lessonId}`, payload);
      if (response.data?.success) {
        const updated = response.data.progress;
        onProgressUpdate({
          status: updated.status,
          lastPosition: updated.lastPosition,
          timeSpent: updated.timeSpent,
          updatedAt: updated.updatedAt,
        });
        if (typeof updated.quizScore === 'number') {
          setMessage(`Bạn đã nộp bài! Điểm: ${updated.quizScore}%`);
        } else {
          setMessage('Đã lưu bài làm của bạn.');
        }
      }
    } catch (err) {
      console.error('Failed to submit quiz:', err);
      setError('Không thể nộp bài kiểm tra. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bài kiểm tra nhanh</h3>
          <p className="text-sm text-gray-500">
            Chọn đáp án cho mỗi câu hỏi bên dưới rồi nhấn &quot;Nộp bài&quot; để chấm điểm.
          </p>
        </div>
        {typeof (progress as any)?.quizScore === 'number' && (
          <div className="text-right">
            <p className="text-xs text-gray-500">Điểm lần gần nhất</p>
            <p className="text-lg font-semibold text-blue-600">{(progress as any).quizScore}%</p>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {questions.map((question, index) => {
          const key = String(index);
          const value = answers[key] ?? '';

          return (
            <div key={`${question.question}-${index}`} className="border border-gray-100 rounded-xl p-4 space-y-2">
              <p className="text-sm font-medium text-gray-900">
                Câu {index + 1}. {question.question}
              </p>

              {question.type === 'multiple_choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`q-${index}`}
                        value={option}
                        checked={value === option}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'true_false' && (
                <div className="space-y-2">
                  {['true', 'false'].map((option) => (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`q-${index}`}
                        value={option}
                        checked={value === option}
                        onChange={(e) => handleChange(index, e.target.value)}
                        className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <span>{option === 'true' ? 'Đúng' : 'Sai'}</span>
                    </label>
                  ))}
                </div>
              )}

              {question.type === 'short_answer' && (
                <div>
                  <textarea
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập câu trả lời ngắn của bạn..."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Nộp bài
        </button>

        <div className="text-sm">
          {message && <p className="text-green-600">{message}</p>}
          {error && <p className="text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function LessonActions({
  progress,
  canComplete,
  onMarkComplete,
  markingComplete,
  actionMessage,
  actionError,
}: {
  progress: LessonProgress | null;
  canComplete: boolean;
  onMarkComplete: () => void;
  markingComplete: boolean;
  actionMessage: string | null;
  actionError: string | null;
}) {
  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-900">Tiến độ bài học</p>
        <div className="mt-2 flex items-center gap-3 text-sm text-gray-600">
          <span className="font-semibold capitalize">
            {progress?.status === 'completed'
              ? 'Đã hoàn thành'
              : progress?.status === 'in_progress'
              ? 'Đang học'
              : 'Chưa bắt đầu'}
          </span>
          {progress?.updatedAt && <span>Cập nhật: {formatDateTime(progress.updatedAt)}</span>}
        </div>
      </div>

      {canComplete && (
        <button
          onClick={onMarkComplete}
          disabled={markingComplete || progress?.status === 'completed'}
          className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          {markingComplete ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
          {progress?.status === 'completed' ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
        </button>
      )}

      {actionMessage && <p className="text-sm text-green-600">{actionMessage}</p>}
      {actionError && <p className="text-sm text-red-600">{actionError}</p>}
    </div>
  );
}

function LessonNavigator({
  previousLesson,
  nextLesson,
  slug,
  onNavigate,
  isEnrolled,
}: {
  previousLesson: (LessonListItem & { sectionTitle?: string }) | null;
  nextLesson: (LessonListItem & { sectionTitle?: string }) | null;
  slug: string;
  onNavigate: (lessonId?: string, locked?: boolean) => void;
  isEnrolled: boolean;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-2xl shadow p-5">
        <p className="text-xs uppercase tracking-wide text-gray-400">Bài trước</p>
        {previousLesson ? (
          <>
            <p className="mt-1 text-sm font-semibold text-gray-900">{previousLesson.title}</p>
            <button
              onClick={() => onNavigate(previousLesson._id)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" /> Quay lại
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Bạn đang ở bài đầu tiên</p>
        )}
      </div>
      <div className="bg-white rounded-2xl shadow p-5 text-right">
        <p className="text-xs uppercase tracking-wide text-gray-400">Bài kế tiếp</p>
        {nextLesson ? (
          <>
            <p className="mt-1 text-sm font-semibold text-gray-900">{nextLesson.title}</p>
            <button
              onClick={() => onNavigate(nextLesson._id, !isEnrolled && !nextLesson.isFree)}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-blue-600"
            >
              Tiếp tục <ArrowRight className="h-4 w-4" />
            </button>
          </>
        ) : (
          <p className="mt-1 text-sm text-gray-500">Bạn đã đến bài cuối cùng</p>
        )}
      </div>
    </div>
  );
}

function LockedLessonCTA({ slug }: { slug: string }) {
  return (
    <div className="bg-white rounded-2xl shadow p-10 text-center space-y-4">
      <ShieldAlert className="h-12 w-12 text-yellow-500 mx-auto" />
      <h3 className="text-xl font-semibold text-gray-900">Bài học này chỉ dành cho học viên đã đăng ký</h3>
      <p className="text-gray-600">
        Hãy quay lại trang khóa học và hoàn tất đăng ký để mở khóa toàn bộ nội dung.
      </p>
      <Link
        href={`/courses/${slug}`}
        className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700"
      >
        Quay lại khóa học
      </Link>
    </div>
  );
}


