'use client';

import { useState, FormEvent } from 'react';
import { X, Video, FileText, HelpCircle, BookOpen, Paperclip, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface LessonCreateModalProps {
  isOpen: boolean;
  sectionId: string;
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type LessonType = 'video' | 'article' | 'quiz' | 'assignment' | 'resource';

interface LessonFormState {
  title: string;
  type: LessonType;
  description: string;
  isFree: boolean;
  isPublished: boolean;
  // Video specific
  videoUrl: string;
  videoDuration: string;
  videoSource: 'url' | 'upload';
  videoProvider: 'cloudinary' | 'youtube' | 'vimeo';
  // Article specific
  articleContent: string;
  // Quiz specific
  quizQuestions: Array<{
    question: string;
    type: string;
    options?: string[];
    correctAnswer?: string;
    explanation?: string;
    points?: number;
  }>;
}

const lessonTypes: { value: LessonType; label: string; icon: typeof Video; description: string }[] = [
  { value: 'video', label: 'Video', icon: Video, description: 'Video lesson với URL hoặc upload' },
  { value: 'article', label: 'Article', icon: FileText, description: 'Bài viết với nội dung text' },
  { value: 'quiz', label: 'Quiz', icon: HelpCircle, description: 'Câu hỏi trắc nghiệm' },
  { value: 'assignment', label: 'Assignment', icon: BookOpen, description: 'Bài tập về nhà' },
  { value: 'resource', label: 'Resource', icon: Paperclip, description: 'Tài liệu tham khảo' },
];

export default function LessonCreateModal({
  isOpen,
  sectionId,
  courseId: _courseId,
  onClose,
  onSuccess,
}: LessonCreateModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'settings'>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<LessonFormState>({
    title: '',
    type: 'video',
    description: '',
    isFree: false,
    isPublished: false,
    videoUrl: '',
    videoDuration: '',
    videoSource: 'url',
    videoProvider: 'cloudinary',
    articleContent: '',
    quizQuestions: [
      {
        question: 'Câu hỏi ví dụ',
        type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: '',
        points: 1,
      },
    ],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formState.title.trim()) {
      errors.title = 'Tiêu đề bài học là bắt buộc.';
    }

    if (formState.type === 'video' && !formState.videoUrl.trim()) {
      errors.videoUrl = 'Video URL là bắt buộc với bài học video.';
    }

    if (formState.type === 'article' && !formState.articleContent.trim()) {
      errors.articleContent = 'Nội dung bài viết là bắt buộc với bài học article.';
    }

    if (formState.type === 'quiz') {
      if (formState.quizQuestions.length === 0) {
        errors.quizQuestions = 'Quiz cần ít nhất một câu hỏi.';
      } else {
        // Validate each question
        formState.quizQuestions.forEach((q, i) => {
          if (!q.question.trim()) {
            errors[`quizQuestions.${i}.question`] = `Câu hỏi ${i + 1} không được để trống.`;
          }
          if (q.type === 'multiple_choice') {
            if (!q.options || q.options.length < 2) {
              errors[`quizQuestions.${i}.options`] = `Câu hỏi ${i + 1} cần ít nhất 2 lựa chọn.`;
            }
            if (!q.correctAnswer || !q.options || !q.options.includes(q.correctAnswer)) {
              errors[`quizQuestions.${i}.correctAnswer`] = `Câu hỏi ${i + 1} cần có đáp án đúng hợp lệ.`;
            }
          } else if (!q.correctAnswer || !q.correctAnswer.trim()) {
            errors[`quizQuestions.${i}.correctAnswer`] = `Câu hỏi ${i + 1} cần có đáp án đúng.`;
          }
          if (!q.points || q.points < 1) {
            errors[`quizQuestions.${i}.points`] = `Câu hỏi ${i + 1} cần có điểm số tối thiểu là 1.`;
          }
        });
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField.startsWith('quizQuestions')) {
        setActiveTab('content');
      }
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                        document.querySelector(`#${firstErrorField}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }, 100);
      return;
    }

    try {
      setSubmitting(true);

      const payload: any = {
        title: formState.title.trim(),
        type: formState.type,
        description: formState.description.trim() || undefined,
        isFree: formState.isFree,
      };

      // Add type-specific content
      if (formState.type === 'video') {
        payload.videoUrl = formState.videoUrl.trim();
        payload.videoProvider = formState.videoProvider;
        if (formState.videoDuration) {
          const durationNum = Number(formState.videoDuration);
          if (!Number.isNaN(durationNum) && durationNum > 0) {
            payload.videoDuration = durationNum;
          }
        }
      } else if (formState.type === 'article') {
        payload.articleContent = formState.articleContent.trim();
      } else if (formState.type === 'quiz') {
        payload.quizQuestions = formState.quizQuestions.map((q) => ({
          question: q.question.trim(),
          type: q.type,
          options: q.options?.filter((o) => o.trim()) || [],
          correctAnswer: q.correctAnswer || '',
          explanation: q.explanation?.trim() || undefined,
          points: q.points || 1,
        }));
      }

      const res = await api.post(`/sections/${sectionId}/lessons`, payload);

      if (res.data?.success) {
        // Update published status if needed
        if (formState.isPublished && res.data.lesson?._id) {
          try {
            await api.put(`/lessons/${res.data.lesson._id}`, {
              isPublished: true,
            });
          } catch (publishErr) {
            console.warn('Failed to publish lesson:', publishErr);
            // Don't fail the whole operation
          }
        }
        onSuccess();
      } else {
        setError(res.data?.message || 'Không thể tạo bài học.');
      }
    } catch (err: any) {
      console.error('Failed to create lesson:', err);
      
      // Parse backend validation errors
      const backendErrors: Record<string, string> = {};
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: any) => {
          const field = error.path || error.field || 'general';
          backendErrors[field] = error.message || error.msg || 'Lỗi validation';
        });
      }

      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors(backendErrors);
      } else {
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.errors?.[0]?.message ||
          'Không thể tạo bài học, vui lòng thử lại.';
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleTypeChange = (type: LessonType) => {
    setFormState((prev) => ({ ...prev, type }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Tạo Bài Học Mới</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Thông Tin Cơ Bản
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'content'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Nội Dung
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Cài Đặt
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Có lỗi xảy ra</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Basic Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formState.title}
                    onChange={(e) => {
                      setFormState((prev) => ({ ...prev, title: e.target.value }));
                      if (fieldErrors.title) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.title;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ví dụ: Giới thiệu về React Hooks"
                    maxLength={200}
                    required
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Tiêu đề ngắn gọn, mô tả rõ nội dung bài học (tối đa 200 ký tự)
                    </p>
                    <span className="text-xs text-gray-400">
                      {formState.title.length}/200
                    </span>
                  </div>
                  {fieldErrors.title && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.title}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Loại Bài Học <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {lessonTypes.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => handleTypeChange(type.value)}
                          className={`p-4 border-2 rounded-lg text-left transition-all ${
                            formState.type === type.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 mb-2 ${formState.type === type.value ? 'text-blue-600' : 'text-gray-400'}`} />
                          <div className="font-medium text-sm text-gray-900">{type.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mô Tả <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Mô tả chi tiết về nội dung bài học, mục tiêu học tập..."
                    maxLength={1000}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Mô tả giúp học viên hiểu rõ nội dung bài học (tối đa 1000 ký tự)
                    </p>
                    <span className="text-xs text-gray-400">
                      {formState.description.length}/1000
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Content Tab */}
            {activeTab === 'content' && (
              <div className="space-y-6">
                {formState.type === 'video' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nguồn Video
                      </label>
                      <div className="flex gap-4 mb-4">
                        <button
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, videoSource: 'url' }))}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            formState.videoSource === 'url'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Video URL
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormState((prev) => ({ ...prev, videoSource: 'upload' }))}
                          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                            formState.videoSource === 'upload'
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Upload Video
                        </button>
                      </div>
                    </div>

                    {formState.videoSource === 'url' ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Video URL <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="url"
                            name="videoUrl"
                            value={formState.videoUrl}
                            onChange={(e) => {
                              setFormState((prev) => ({ ...prev, videoUrl: e.target.value }));
                              if (fieldErrors.videoUrl) {
                                setFieldErrors((prev) => {
                                  const newErrors = { ...prev };
                                  delete newErrors.videoUrl;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              fieldErrors.videoUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="https://youtube.com/watch?v=... hoặc https://vimeo.com/..."
                            required
                          />
                          {fieldErrors.videoUrl && (
                            <p className="mt-1 text-xs text-red-600 flex items-center">
                              <span className="mr-1">⚠️</span>
                              {fieldErrors.videoUrl}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            Nhập URL video từ YouTube, Vimeo hoặc Cloudinary. Ví dụ: https://www.youtube.com/watch?v=dQw4w9WgXcQ
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nhà Cung Cấp Video <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                          </label>
                          <select
                            value={formState.videoProvider}
                            onChange={(e) =>
                              setFormState((prev) => ({
                                ...prev,
                                videoProvider: e.target.value as 'cloudinary' | 'youtube' | 'vimeo',
                              }))
                            }
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="cloudinary">Cloudinary (Mặc định)</option>
                            <option value="youtube">YouTube</option>
                            <option value="vimeo">Vimeo</option>
                          </select>
                          <p className="mt-1 text-xs text-gray-500">
                            Chọn nhà cung cấp video phù hợp với URL của bạn. Nếu không chọn, hệ thống sẽ tự động nhận diện.
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Thời Lượng (phút)
                          </label>
                          <input
                            type="number"
                            value={formState.videoDuration}
                            onChange={(e) => setFormState((prev) => ({ ...prev, videoDuration: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="60"
                            min="1"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="p-8 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 mb-4">Tính năng upload video đang được phát triển</p>
                        <p className="text-sm text-gray-500">Vui lòng sử dụng Video URL tạm thời</p>
                      </div>
                    )}
                  </>
                )}

                {formState.type === 'article' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nội Dung Bài Viết <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="articleContent"
                      value={formState.articleContent}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, articleContent: e.target.value }));
                        if (fieldErrors.articleContent) {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.articleContent;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                        fieldErrors.articleContent ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      rows={12}
                      placeholder="Nhập nội dung bài viết..."
                      required
                    />
                    {fieldErrors.articleContent && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.articleContent}
                      </p>
                    )}
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-500">
                        Hỗ trợ Markdown để định dạng văn bản. Bạn có thể sử dụng các thẻ như **bold**, *italic*, `code`, # heading, v.v.
                      </p>
                      <p className="text-xs text-gray-400">
                        Ví dụ: Sử dụng **in đậm** để nhấn mạnh, `code` để hiển thị mã, và # Tiêu đề cho các phần.
                      </p>
                    </div>
                  </div>
                )}

                {formState.type === 'quiz' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Câu Hỏi Quiz <span className="text-red-500">*</span>
                    </label>
                    {formState.quizQuestions.map((q, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Câu hỏi {index + 1}
                          </label>
                          <input
                            type="text"
                            value={q.question}
                            onChange={(e) => {
                              const updated = [...formState.quizQuestions];
                              updated[index] = { ...updated[index], question: e.target.value };
                              setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Nhập câu hỏi"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Loại câu hỏi
                            </label>
                            <select
                              value={q.type}
                              onChange={(e) => {
                                const updated = [...formState.quizQuestions];
                                updated[index] = {
                                  ...updated[index],
                                  type: e.target.value,
                                  options: e.target.value === 'multiple_choice' ? updated[index].options || [''] : undefined,
                                };
                                setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            >
                              <option value="multiple_choice">Trắc nghiệm</option>
                              <option value="true_false">Đúng/Sai</option>
                              <option value="short_answer">Tự luận ngắn</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Điểm số
                            </label>
                            <input
                              type="number"
                              name={`quizQuestions.${index}.points`}
                              min="1"
                              value={q.points || 1}
                              onChange={(e) => {
                                const updated = [...formState.quizQuestions];
                                updated[index] = {
                                  ...updated[index],
                                  points: Number(e.target.value) || 1,
                                };
                                setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                                if (fieldErrors[`quizQuestions.${index}.points`]) {
                                  setFieldErrors((prev) => {
                                    const newErrors = { ...prev };
                                    delete newErrors[`quizQuestions.${index}.points`];
                                    return newErrors;
                                  });
                                }
                              }}
                              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                fieldErrors[`quizQuestions.${index}.points`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                              }`}
                            />
                            {fieldErrors[`quizQuestions.${index}.points`] && (
                              <p className="mt-1 text-xs text-red-600 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {fieldErrors[`quizQuestions.${index}.points`]}
                              </p>
                            )}
                          </div>
                        </div>
                        {q.type === 'multiple_choice' && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Các lựa chọn
                            </label>
                            {fieldErrors[`quizQuestions.${index}.options`] && (
                              <p className="mb-1 text-xs text-red-600 flex items-center">
                                <span className="mr-1">⚠️</span>
                                {fieldErrors[`quizQuestions.${index}.options`]}
                              </p>
                            )}
                            {(q.options || []).map((option, optIndex) => (
                              <div key={optIndex} className="flex gap-2 mb-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => {
                                    const updated = [...formState.quizQuestions];
                                    const options = [...(updated[index].options || [])];
                                    options[optIndex] = e.target.value;
                                    updated[index] = { ...updated[index], options };
                                    setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                                    if (fieldErrors[`quizQuestions.${index}.options`]) {
                                      setFieldErrors((prev) => {
                                        const newErrors = { ...prev };
                                        delete newErrors[`quizQuestions.${index}.options`];
                                        return newErrors;
                                      });
                                    }
                                  }}
                                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                                    fieldErrors[`quizQuestions.${index}.options`] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                  }`}
                                  placeholder={`Lựa chọn ${optIndex + 1}`}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...formState.quizQuestions];
                                    const options = [...(updated[index].options || [])];
                                    options.splice(optIndex, 1);
                                    updated[index] = { ...updated[index], options };
                                    setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                                  }}
                                  className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                                  disabled={(q.options || []).length <= 2}
                                >
                                  Xóa
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...formState.quizQuestions];
                                const options = [...(updated[index].options || []), ''];
                                updated[index] = { ...updated[index], options };
                                setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                              }}
                              className="text-sm text-blue-600 hover:text-blue-700"
                            >
                              + Thêm lựa chọn
                            </button>
                            <div className="mt-2">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Đáp án đúng
                              </label>
                              <select
                                value={q.correctAnswer || ''}
                                onChange={(e) => {
                                  const updated = [...formState.quizQuestions];
                                  updated[index] = { ...updated[index], correctAnswer: e.target.value };
                                  setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="">Chọn đáp án đúng</option>
                                {(q.options || []).map((opt, optIdx) => (
                                  <option key={optIdx} value={opt}>
                                    {opt || `Lựa chọn ${optIdx + 1}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        )}
                        {(q.type === 'true_false' || q.type === 'short_answer') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Đáp án đúng
                            </label>
                            <input
                              type="text"
                              value={q.correctAnswer || ''}
                              onChange={(e) => {
                                const updated = [...formState.quizQuestions];
                                updated[index] = { ...updated[index], correctAnswer: e.target.value };
                                setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              placeholder={q.type === 'true_false' ? 'true hoặc false' : 'Nhập đáp án đúng'}
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Giải thích (tùy chọn)
                          </label>
                          <textarea
                            value={q.explanation || ''}
                            onChange={(e) => {
                              const updated = [...formState.quizQuestions];
                              updated[index] = { ...updated[index], explanation: e.target.value };
                              setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            rows={2}
                            placeholder="Giải thích tại sao đáp án này đúng"
                          />
                        </div>
                        {formState.quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = formState.quizQuestions.filter((_, i) => i !== index);
                              setFormState((prev) => ({ ...prev, quizQuestions: updated }));
                            }}
                            className="text-sm text-red-600 hover:text-red-700"
                          >
                            Xóa câu hỏi này
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        setFormState((prev) => ({
                          ...prev,
                          quizQuestions: [
                            ...prev.quizQuestions,
                            {
                              question: '',
                              type: 'multiple_choice',
                              options: ['', ''],
                              correctAnswer: '',
                              explanation: '',
                              points: 1,
                            },
                          ],
                        }));
                      }}
                      className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                    >
                      + Thêm câu hỏi
                    </button>
                  </div>
                )}

                {(formState.type === 'assignment' || formState.type === 'resource') && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Loại bài học này sẽ được tạo với nội dung cơ bản. Bạn có thể chỉnh sửa chi tiết sau khi tạo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Thông tin về các cài đặt</h3>
                  <p className="text-xs text-blue-800">
                    Các cài đặt này có thể được thay đổi sau khi tạo bài học. Bạn có thể chỉnh sửa từ trang quản lý khóa học.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Bài Học Miễn Phí</label>
                    <p className="text-sm text-gray-500">Học viên có thể xem mà không cần đăng ký khóa học</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Bật tính năng này để cho phép học viên xem bài học này ngay cả khi chưa đăng ký khóa học. Hữu ích cho các bài học giới thiệu hoặc demo.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.isFree}
                      onChange={(e) => setFormState((prev) => ({ ...prev, isFree: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Xuất Bản Ngay</label>
                    <p className="text-sm text-gray-500">Bài học sẽ được hiển thị cho học viên ngay sau khi tạo</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Nếu bật, bài học sẽ được xuất bản ngay lập tức. Nếu tắt, bài học sẽ ở trạng thái nháp và bạn có thể chỉnh sửa trước khi xuất bản.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.isPublished}
                      onChange={(e) => setFormState((prev) => ({ ...prev, isPublished: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo Bài Học'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
