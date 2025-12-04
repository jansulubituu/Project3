'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type LessonType = 'video' | 'article' | 'quiz' | 'assignment' | 'resource';

type QuizQuestionType = 'multiple_choice' | 'true_false' | 'short_answer';

interface QuizQuestionForm {
  question: string;
  type: QuizQuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

interface AttachmentForm {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface LessonEditForm {
  title: string;
  description: string;
  type: LessonType;
  order: number;
  isFree: boolean;
  isPublished: boolean;
  duration: number;

  // video
  videoUrl: string;
  videoDuration: number | '';
  videoProvider: 'cloudinary' | 'youtube' | 'vimeo';

  // article
  articleContent: string;

  // quiz
  quizQuestions: QuizQuestionForm[];

  // attachments
  attachments: AttachmentForm[];
}

function EditLessonContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = params?.id;

  const [form, setForm] = useState<LessonEditForm | null>(null);
  const [courseSlug, setCourseSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [videoSource, setVideoSource] = useState<'upload' | 'url'>('url');
  const [videoUploading, setVideoUploading] = useState(false);
  const [videoUploadError, setVideoUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;

    const fetchLesson = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/lessons/${lessonId}`);
        if (!res.data?.success || !res.data.lesson) {
          setError('Không tìm thấy bài học hoặc bạn không có quyền truy cập.');
          return;
        }

        const lesson = res.data.lesson;
        setCourseSlug(lesson.course?.slug || null);

        const quizQuestions: QuizQuestionForm[] =
          (lesson.quizQuestions || []).map((q: any) => ({
            question: q.question || '',
            type: q.type || 'multiple_choice',
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.correctAnswer || '',
            explanation: q.explanation || '',
            points: typeof q.points === 'number' ? q.points : 1,
          })) || [];

        const attachments: AttachmentForm[] =
          (lesson.attachments || []).map((a: any) => ({
            name: a.name || '',
            url: a.url || '',
            type: a.type || '',
            size: typeof a.size === 'number' ? a.size : 0,
          })) || [];

        setForm({
          title: lesson.title || '',
          description: lesson.description || '',
          type: lesson.type,
          order: lesson.order || 1,
          isFree: !!lesson.isFree,
          isPublished: !!lesson.isPublished,
          duration: lesson.duration || 0,

          videoUrl: lesson.videoUrl || '',
          videoDuration:
            typeof lesson.videoDuration === 'number' && lesson.videoDuration >= 0
              ? lesson.videoDuration
              : '',
          videoProvider: lesson.videoProvider || 'cloudinary',

          articleContent: lesson.articleContent || '',

          quizQuestions,

          attachments,
        });
      } catch (err) {
        console.error('Failed to load lesson:', err);
        setError('Không thể tải dữ liệu bài học.');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  const handleBasicChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!form) return;
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: checked });
    } else if (name === 'order' || name === 'duration') {
      setForm({ ...form, [name]: Number(value) || 0 });
    } else if (name === 'videoDuration') {
      const num = Number(value);
      setForm({ ...form, videoDuration: value === '' ? '' : Number.isNaN(num) ? '' : num });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleQuizQuestionChange = (
    index: number,
    field: keyof QuizQuestionForm,
    value: string | number | QuizQuestionType
  ) => {
    if (!form) return;
    const updated = [...form.quizQuestions];
    const question = { ...updated[index] };

    if (field === 'points') {
      const num = typeof value === 'number' ? value : Number(value);
      question.points = Number.isNaN(num) || num <= 0 ? 1 : num;
    } else if (field === 'type') {
      question.type = value as QuizQuestionType;
      if (question.type === 'true_false') {
        question.options = ['true', 'false'];
        if (!['true', 'false'].includes(question.correctAnswer)) {
          question.correctAnswer = 'true';
        }
      } else if (question.type === 'short_answer') {
        question.options = [];
      }
    } else {
      (question as any)[field] = value;
    }

    updated[index] = question;
    setForm({ ...form, quizQuestions: updated });
  };

  const handleQuizOptionChange = (qIndex: number, optIndex: number, value: string) => {
    if (!form) return;
    const updated = [...form.quizQuestions];
    const question = { ...updated[qIndex] };
    const options = [...question.options];
    options[optIndex] = value;
    question.options = options;
    updated[qIndex] = question;
    setForm({ ...form, quizQuestions: updated });
  };

  const handleAddQuizQuestion = () => {
    if (!form) return;
    const newQuestion: QuizQuestionForm = {
      question: '',
      type: 'multiple_choice',
      options: [''],
      correctAnswer: '',
      explanation: '',
      points: 1,
    };
    setForm({ ...form, quizQuestions: [...form.quizQuestions, newQuestion] });
  };

  const handleRemoveQuizQuestion = (index: number) => {
    if (!form) return;
    const updated = form.quizQuestions.filter((_, i) => i !== index);
    setForm({ ...form, quizQuestions: updated });
  };

  const handleAddAttachment = () => {
    if (!form) return;
    const newAttachment: AttachmentForm = {
      name: '',
      url: '',
      type: '',
      size: 0,
    };
    setForm({ ...form, attachments: [...form.attachments, newAttachment] });
  };

  const handleAttachmentChange = (
    index: number,
    field: keyof AttachmentForm,
    value: string | number
  ) => {
    if (!form) return;
    const updated = [...form.attachments];
    const att = { ...updated[index] };
    if (field === 'size') {
      const num = typeof value === 'number' ? value : Number(value);
      att.size = Number.isNaN(num) || num < 0 ? 0 : num;
    } else {
      (att as any)[field] = value;
    }
    updated[index] = att;
    setForm({ ...form, attachments: updated });
  };

  const handleRemoveAttachment = (index: number) => {
    if (!form) return;
    const updated = form.attachments.filter((_, i) => i !== index);
    setForm({ ...form, attachments: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !lessonId) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        order: form.order,
        isFree: form.isFree,
        isPublished: form.isPublished,
        duration: form.duration,
      };

      if (form.type === 'video') {
        payload.type = 'video';
        payload.videoUrl = form.videoUrl.trim();
        payload.videoDuration =
          typeof form.videoDuration === 'number' ? form.videoDuration : undefined;
        payload.videoProvider = form.videoProvider;
      } else if (form.type === 'article') {
        payload.type = 'article';
        payload.articleContent = form.articleContent;
      } else if (form.type === 'quiz') {
        payload.type = 'quiz';
        payload.quizQuestions = form.quizQuestions
          .filter((q) => q.question.trim())
          .map((q) => ({
            question: q.question.trim(),
            type: q.type,
            options: q.type === 'multiple_choice' ? q.options.filter((o) => o.trim()) : undefined,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation?.trim() || undefined,
            points: q.points || 1,
          }));
      }

      if (form.attachments.length > 0) {
        payload.attachments = form.attachments
          .filter((a) => a.name.trim() && a.url.trim())
          .map((a) => ({
            name: a.name.trim(),
            url: a.url.trim(),
            type: a.type.trim() || 'file',
            size: a.size || 0,
          }));
      }

      const res = await api.put(`/lessons/${lessonId}`, payload);
      if (res.data?.success) {
        setSuccess('Cập nhật bài học thành công.');
      } else {
        setError(res.data?.message || 'Không thể cập nhật bài học.');
      }
    } catch (err) {
      console.error('Failed to save lesson:', err);
      let message = 'Không thể cập nhật bài học. Vui lòng thử lại.';
      if (typeof err === 'object' && err !== null) {
        const anyErr = err as {
          response?: { data?: { errors?: { message?: string }[]; message?: string; error?: string } };
        };
        const data = anyErr.response?.data;
        message =
          data?.errors?.[0]?.message || data?.message || (data?.error as string | undefined) || message;
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu bài học...</p>
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            type="button"
            onClick={() =>
              courseSlug
                ? router.push(`/courses/${courseSlug}/learn/${lessonId}`)
                : router.back()
            }
            className="mb-4 text-sm text-gray-600 hover:text-gray-800"
          >
            ← Quay lại bài học
          </button>

          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Chỉnh sửa bài học</h1>
            <p className="text-sm text-gray-600 mb-6">
              Chỉ giảng viên sở hữu khóa học hoặc admin mới có quyền chỉnh sửa bài học.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tiêu đề bài học
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleBasicChange}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thứ tự
                    </label>
                    <input
                      type="number"
                      name="order"
                      min={1}
                      value={form.order}
                      onChange={handleBasicChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Thời lượng (phút)
                    </label>
                    <input
                      type="number"
                      name="duration"
                      min={0}
                      value={form.duration}
                      onChange={handleBasicChange}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-gray-500">Loại bài học</span>
                    <span className="inline-flex items-center justify-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 capitalize">
                      {form.type}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả ngắn
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleBasicChange}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="isFree"
                    checked={form.isFree}
                    onChange={handleBasicChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2">Bài học miễn phí</span>
                </label>
                <label className="inline-flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="isPublished"
                    checked={form.isPublished}
                    onChange={handleBasicChange}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                  />
                  <span className="ml-2">Đã xuất bản</span>
                </label>
              </div>

              {/* Content by type */}
              {form.type === 'video' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h2 className="text-lg font-semibold text-gray-900">Nội dung video</h2>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-4 items-center">
                      <span className="text-sm font-medium text-gray-700">Nguồn video:</span>
                      <label className="inline-flex items-center text-sm text-gray-700">
                        <input
                          type="radio"
                          name="videoSource"
                          value="url"
                          checked={videoSource === 'url'}
                          onChange={() => setVideoSource('url')}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="ml-2">Đường link (YouTube / URL khác)</span>
                      </label>
                      <label className="inline-flex items-center text-sm text-gray-700">
                        <input
                          type="radio"
                          name="videoSource"
                          value="upload"
                          checked={videoSource === 'upload'}
                          onChange={() => setVideoSource('upload')}
                          className="h-4 w-4 text-blue-600 border-gray-300"
                        />
                        <span className="ml-2">Tải file video lên (tối đa 100MB)</span>
                      </label>
                    </div>

                    {videoSource === 'upload' && (
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="video/*"
                          disabled={videoUploading}
                          onChange={async (e) => {
                            if (!e.target.files || e.target.files.length === 0 || !form) return;
                            const file = e.target.files[0];
                            if (!file) return;
                            setVideoUploadError(null);
                            const maxSizeMb = 100;
                            if (file.size > maxSizeMb * 1024 * 1024) {
                              setVideoUploadError(`Kích thước video phải nhỏ hơn hoặc bằng ${maxSizeMb}MB.`);
                              e.target.value = '';
                              return;
                            }
                            try {
                              setVideoUploading(true);
                              const formData = new FormData();
                              formData.append('video', file);
                              const res = await api.post('/uploads/video?folder=edulearn/lesson-videos', formData, {
                                headers: { 'Content-Type': 'multipart/form-data' },
                              });
                              if (res.data?.success && res.data.url) {
                                setForm({
                                  ...form,
                                  videoUrl: res.data.url,
                                  videoProvider: 'cloudinary',
                                });
                                setSuccess('Upload video thành công.');
                              } else {
                                setVideoUploadError(res.data?.message || 'Upload video thất bại.');
                              }
                            } catch (uploadErr: unknown) {
                              console.error('Failed to upload video:', uploadErr);
                              let message = 'Không thể upload video. Vui lòng thử lại.';
                              if (typeof uploadErr === 'object' && uploadErr !== null) {
                                const anyErr = uploadErr as {
                                  response?: { data?: { message?: string; error?: string } };
                                };
                                const data = anyErr.response?.data;
                                message = data?.message || (data?.error as string | undefined) || message;
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
                        {form.videoUrl && (
                          <p className="text-xs text-gray-600 break-all">
                            Video hiện tại: <span className="text-blue-700">{form.videoUrl}</span>
                          </p>
                        )}
                      </div>
                    )}

                    {videoSource === 'url' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Video URL
                          </label>
                          <input
                            type="text"
                            name="videoUrl"
                            value={form.videoUrl}
                            onChange={handleBasicChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="https://www.youtube.com/watch?... hoặc URL video trực tiếp"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Thời lượng (giây)
                          </label>
                          <input
                            type="number"
                            name="videoDuration"
                            min={0}
                            value={form.videoDuration}
                            onChange={handleBasicChange}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    )}

                    <div className="max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nguồn video
                      </label>
                      <select
                        name="videoProvider"
                        value={form.videoProvider}
                        onChange={handleBasicChange}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="cloudinary">Cloudinary</option>
                        <option value="youtube">YouTube</option>
                        <option value="vimeo">Vimeo</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.type === 'article' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h2 className="text-lg font-semibold text-gray-900">Nội dung bài viết</h2>
                  <p className="text-xs text-gray-500">
                    Bạn có thể dán HTML đã format (ví dụ từ editor rich-text) hoặc nội dung text
                    đơn giản.
                  </p>
                  <textarea
                    name="articleContent"
                    value={form.articleContent}
                    onChange={handleBasicChange}
                    rows={10}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              {form.type === 'quiz' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Câu hỏi quiz</h2>
                    <button
                      type="button"
                      onClick={handleAddQuizQuestion}
                      className="inline-flex items-center px-3 py-1.5 rounded-md bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                    >
                      + Thêm câu hỏi
                    </button>
                  </div>
                  {form.quizQuestions.length === 0 ? (
                    <p className="text-sm text-gray-500">
                      Chưa có câu hỏi nào. Thêm ít nhất 1 câu hỏi để bài quiz hợp lệ.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {form.quizQuestions.map((q, index) => (
                        <div
                          key={index}
                          className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">
                              Câu hỏi {index + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveQuizQuestion(index)}
                              className="text-xs text-red-600 hover:underline"
                            >
                              Xóa
                            </button>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Nội dung câu hỏi
                            </label>
                            <input
                              type="text"
                              value={q.question}
                              onChange={(e) =>
                                handleQuizQuestionChange(index, 'question', e.target.value)
                              }
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Loại câu hỏi
                              </label>
                              <select
                                value={q.type}
                                onChange={(e) =>
                                  handleQuizQuestionChange(
                                    index,
                                    'type',
                                    e.target.value as QuizQuestionType
                                  )
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              >
                                <option value="multiple_choice">Trắc nghiệm chọn 1</option>
                                <option value="true_false">Đúng / Sai</option>
                                <option value="short_answer">Trả lời ngắn</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Đáp án đúng
                              </label>
                              <input
                                type="text"
                                value={q.correctAnswer}
                                onChange={(e) =>
                                  handleQuizQuestionChange(index, 'correctAnswer', e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder={
                                  q.type === 'true_false'
                                    ? 'true hoặc false'
                                    : q.type === 'short_answer'
                                    ? 'Đáp án text'
                                    : 'Giá trị trùng với 1 trong các option'
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Điểm
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={q.points}
                                onChange={(e) =>
                                  handleQuizQuestionChange(index, 'points', e.target.value)
                                }
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {q.type === 'multiple_choice' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-700">
                                  Các lựa chọn
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuizOptionChange(index, q.options.length, '')
                                  }
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  + Thêm lựa chọn
                                </button>
                              </div>
                              {q.options.length === 0 && (
                                <p className="text-xs text-gray-500">
                                  Chưa có lựa chọn nào, hãy thêm ít nhất 2 lựa chọn.
                                </p>
                              )}
                              {q.options.map((opt, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={opt}
                                    onChange={(e) =>
                                      handleQuizOptionChange(index, optIndex, e.target.value)
                                    }
                                    className="flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder={`Lựa chọn ${optIndex + 1}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...form.quizQuestions];
                                      const question = { ...updated[index] };
                                      question.options = question.options.filter(
                                        (_, i) => i !== optIndex
                                      );
                                      updated[index] = question;
                                      setForm({ ...form, quizQuestions: updated });
                                    }}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Giải thích (không bắt buộc)
                            </label>
                            <textarea
                              value={q.explanation}
                              onChange={(e) =>
                                handleQuizQuestionChange(index, 'explanation', e.target.value)
                              }
                              rows={2}
                              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachments */}
              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Tài liệu đính kèm</h2>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="inline-flex items-center px-3 py-1.5 rounded-md bg-gray-800 text-white text-xs font-medium hover:bg-gray-900"
                  >
                    + Thêm tài liệu
                  </button>
                </div>
                {form.attachments.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Chưa có tài liệu. Bạn có thể thêm link video/phụ lục, file PDF (dạng URL),
                    slide, v.v.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {form.attachments.map((att, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <input
                          type="text"
                          value={att.name}
                          onChange={(e) =>
                            handleAttachmentChange(index, 'name', e.target.value)
                          }
                          placeholder="Tên hiển thị"
                          className="md:col-span-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <input
                          type="text"
                          value={att.url}
                          onChange={(e) =>
                            handleAttachmentChange(index, 'url', e.target.value)
                          }
                          placeholder="https://..."
                          className="md:col-span-2 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                        <div className="flex items-center gap-2 md:col-span-1">
                          <input
                            type="text"
                            value={att.type}
                            onChange={(e) =>
                              handleAttachmentChange(index, 'type', e.target.value)
                            }
                            placeholder="pdf, link..."
                            className="flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(index)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={saving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function EditLessonPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <EditLessonContent />
    </ProtectedRoute>
  );
}


