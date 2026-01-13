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
  // Article specific
  articleContent: string;
  // Quiz specific
  quizQuestions: Array<{
    question: string;
    type: string;
    options?: string[];
    correctAnswer?: string;
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
  courseId,
  onClose,
  onSuccess,
}: LessonCreateModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'content' | 'settings'>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState<LessonFormState>({
    title: '',
    type: 'video',
    description: '',
    isFree: false,
    isPublished: false,
    videoUrl: '',
    videoDuration: '',
    videoSource: 'url',
    articleContent: '',
    quizQuestions: [
      {
        question: 'Câu hỏi ví dụ',
        type: 'multiple_choice',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      },
    ],
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formState.title.trim()) {
      setError('Tiêu đề bài học là bắt buộc.');
      return;
    }

    if (formState.type === 'video' && !formState.videoUrl.trim()) {
      setError('Video URL là bắt buộc với bài học video.');
      return;
    }

    if (formState.type === 'article' && !formState.articleContent.trim()) {
      setError('Nội dung bài viết là bắt buộc với bài học article.');
      return;
    }

    if (formState.type === 'quiz' && formState.quizQuestions.length === 0) {
      setError('Quiz cần ít nhất một câu hỏi.');
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
        if (formState.videoDuration) {
          const durationNum = Number(formState.videoDuration);
          if (!Number.isNaN(durationNum) && durationNum > 0) {
            payload.videoDuration = durationNum;
          }
        }
      } else if (formState.type === 'article') {
        payload.articleContent = formState.articleContent.trim();
      } else if (formState.type === 'quiz') {
        payload.quizQuestions = formState.quizQuestions;
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
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Không thể tạo bài học, vui lòng thử lại.';
      setError(message);
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
            {/* Basic Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tiêu đề <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formState.title}
                    onChange={(e) => setFormState((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nhập tiêu đề bài học"
                    required
                  />
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô Tả</label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Mô tả ngắn gọn về bài học"
                  />
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
                            value={formState.videoUrl}
                            onChange={(e) => setFormState((prev) => ({ ...prev, videoUrl: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://youtube.com/watch?v=..."
                            required
                          />
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
                      value={formState.articleContent}
                      onChange={(e) => setFormState((prev) => ({ ...prev, articleContent: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={12}
                      placeholder="Nhập nội dung bài viết..."
                      required
                    />
                    <p className="mt-2 text-xs text-gray-500">
                      Hỗ trợ Markdown. Bạn có thể chỉnh sửa chi tiết sau khi tạo.
                    </p>
                  </div>
                )}

                {formState.type === 'quiz' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Câu Hỏi Quiz
                    </label>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Quiz sẽ được tạo với câu hỏi mẫu. Bạn có thể chỉnh sửa chi tiết câu hỏi sau khi tạo bài học.
                      </p>
                    </div>
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
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <label className="font-medium text-gray-900">Bài Học Miễn Phí</label>
                    <p className="text-sm text-gray-500">Học viên có thể xem mà không cần đăng ký</p>
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
