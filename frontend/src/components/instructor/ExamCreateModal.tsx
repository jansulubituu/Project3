'use client';

import { useState, FormEvent } from 'react';
import { X, Loader2, Calendar, Clock, Target, Settings } from 'lucide-react';
import { api } from '@/lib/api';

interface ExamCreateModalProps {
  isOpen: boolean;
  sectionId: string;
  courseId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type ExamStatus = 'draft' | 'published' | 'archived';
type ScoringMethod = 'highest' | 'latest' | 'average';
type ShowAnswers = 'never' | 'after_submit' | 'after_close';
type TimeLimitType = 'per_attempt' | 'global_window';

interface ExamFormState {
  title: string;
  description: string;
  status: ExamStatus;
  totalPoints: string;
  passingScore: string;
  durationMinutes: string;
  maxAttempts: string;
  openAt: string;
  closeAt: string;
  // Advanced
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  scoringMethod: ScoringMethod;
  showCorrectAnswers: ShowAnswers;
  showScoreToStudent: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercent: string;
  timeLimitType: TimeLimitType;
}

export default function ExamCreateModal({
  isOpen,
  sectionId,
  courseId,
  onClose,
  onSuccess,
}: ExamCreateModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'settings' | 'advanced'>('basic');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formState, setFormState] = useState<ExamFormState>({
    title: '',
    description: '',
    status: 'draft',
    totalPoints: '',
    passingScore: '',
    durationMinutes: '60',
    maxAttempts: '',
    openAt: '',
    closeAt: '',
    shuffleQuestions: false,
    shuffleAnswers: false,
    scoringMethod: 'highest',
    showCorrectAnswers: 'after_submit',
    showScoreToStudent: true,
    allowLateSubmission: false,
    latePenaltyPercent: '0',
    timeLimitType: 'per_attempt',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!formState.title.trim()) {
      errors.title = 'Tiêu đề bài kiểm tra là bắt buộc.';
    }

    if (formState.totalPoints) {
      const total = Number(formState.totalPoints);
      if (Number.isNaN(total) || total < 0) {
        errors.totalPoints = 'Tổng điểm phải là số không âm.';
      }
    }

    if (formState.passingScore) {
      const passing = Number(formState.passingScore);
      if (Number.isNaN(passing) || passing < 0) {
        errors.passingScore = 'Điểm đạt phải là số không âm.';
      }
    }

    // Validate passingScore <= totalPoints
    if (formState.totalPoints && formState.passingScore) {
      const total = Number(formState.totalPoints);
      const passing = Number(formState.passingScore);
      if (passing > total) {
        errors.passingScore = 'Điểm đạt không thể lớn hơn tổng điểm.';
      }
    }

    if (formState.durationMinutes) {
      const duration = Number(formState.durationMinutes);
      if (Number.isNaN(duration) || duration < 1) {
        errors.durationMinutes = 'Thời lượng tối thiểu là 1 phút.';
      }
    }

    if (formState.maxAttempts) {
      const maxAttempts = Number(formState.maxAttempts);
      if (Number.isNaN(maxAttempts) || maxAttempts < 1) {
        errors.maxAttempts = 'Số lần làm tối thiểu là 1.';
      }
    }

    // Validate dates
    if (formState.openAt && formState.closeAt) {
      const openDate = new Date(formState.openAt);
      const closeDate = new Date(formState.closeAt);
      if (openDate >= closeDate) {
        errors.closeAt = 'Thời gian mở phải trước thời gian đóng.';
      }
    }

    if (formState.latePenaltyPercent) {
      const penalty = Number(formState.latePenaltyPercent);
      if (Number.isNaN(penalty) || penalty < 0 || penalty > 100) {
        errors.latePenaltyPercent = 'Phần trăm phạt muộn phải từ 0 đến 100.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      // Switch to appropriate tab if needed
      if (['totalPoints', 'passingScore', 'durationMinutes', 'maxAttempts', 'openAt', 'closeAt'].includes(firstErrorField)) {
        setActiveTab('settings');
      } else if (['latePenaltyPercent', 'timeLimitType'].includes(firstErrorField)) {
        setActiveTab('advanced');
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
        course: courseId,
        section: sectionId,
        title: formState.title.trim(),
        description: formState.description.trim() || undefined,
        status: formState.status,
      };

      if (formState.totalPoints) {
        payload.totalPoints = Number(formState.totalPoints);
      }

      if (formState.passingScore) {
        payload.passingScore = Number(formState.passingScore);
      }

      if (formState.durationMinutes) {
        payload.durationMinutes = Number(formState.durationMinutes);
      }

      if (formState.maxAttempts) {
        payload.maxAttempts = Number(formState.maxAttempts);
      }

      if (formState.openAt) {
        payload.openAt = new Date(formState.openAt).toISOString();
      }

      if (formState.closeAt) {
        payload.closeAt = new Date(formState.closeAt).toISOString();
      }

      // Advanced settings
      payload.shuffleQuestions = formState.shuffleQuestions;
      payload.shuffleAnswers = formState.shuffleAnswers;
      payload.scoringMethod = formState.scoringMethod;
      payload.showCorrectAnswers = formState.showCorrectAnswers;
      payload.showScoreToStudent = formState.showScoreToStudent;
      payload.allowLateSubmission = formState.allowLateSubmission;
      payload.latePenaltyPercent = formState.latePenaltyPercent ? Number(formState.latePenaltyPercent) : 0;
      payload.timeLimitType = formState.timeLimitType;

      const res = await api.post('/exams', payload);

      if (res.data?.success) {
        onSuccess();
      } else {
        setError(res.data?.message || 'Không thể tạo bài kiểm tra.');
      }
    } catch (err: any) {
      console.error('Failed to create exam:', err);
      
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
          'Không thể tạo bài kiểm tra, vui lòng thử lại.';
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Tạo Bài Kiểm Tra Mới</h2>
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
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'settings'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Cài Đặt
            </div>
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-6 py-3 font-medium text-sm transition-colors ${
              activeTab === 'advanced'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Nâng Cao
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
                    placeholder="Ví dụ: Kiểm tra cuối kỳ - React Fundamentals"
                    maxLength={200}
                    required
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Tiêu đề rõ ràng, mô tả nội dung bài kiểm tra (tối đa 200 ký tự)
                    </p>
                    <span className="text-xs text-gray-400">
                      {formState.title.length}/200
                    </span>
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
                    placeholder="Mô tả về nội dung, yêu cầu và cách thức làm bài kiểm tra..."
                    maxLength={2000}
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Mô tả giúp học viên hiểu rõ yêu cầu và cách làm bài (tối đa 2000 ký tự)
                    </p>
                    <span className="text-xs text-gray-400">
                      {formState.description.length}/2000
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Trạng Thái <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as ExamStatus }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Bản nháp (Mặc định)</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    <strong>Bản nháp:</strong> Chỉ bạn có thể xem và chỉnh sửa. <strong>Đã xuất bản:</strong> Học viên có thể làm bài. <strong>Đã lưu trữ:</strong> Ẩn khỏi danh sách nhưng vẫn giữ dữ liệu.
                  </p>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tổng Điểm <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="number"
                      name="totalPoints"
                      value={formState.totalPoints}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, totalPoints: e.target.value }));
                        if (fieldErrors.totalPoints) {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.totalPoints;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.totalPoints ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="100"
                      min="0"
                    />
                    {fieldErrors.totalPoints && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.totalPoints}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Tổng điểm của bài kiểm tra. Nếu để trống, hệ thống sẽ tự động tính từ tổng điểm các câu hỏi.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Điểm Đạt <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="number"
                      name="passingScore"
                      value={formState.passingScore}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, passingScore: e.target.value }));
                        if (fieldErrors.passingScore) {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.passingScore;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.passingScore ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="60"
                      min="0"
                    />
                    {fieldErrors.passingScore && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.passingScore}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Điểm tối thiểu để đạt bài kiểm tra. Phải nhỏ hơn hoặc bằng Tổng điểm.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Thời Lượng (phút) <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                      </div>
                    </label>
                    <input
                      type="number"
                      value={formState.durationMinutes}
                      onChange={(e) => setFormState((prev) => ({ ...prev, durationMinutes: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="60"
                      min="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Thời gian làm bài tính bằng phút. Mặc định là 60 phút nếu để trống.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số Lần Làm Tối Đa <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                    </label>
                    <input
                      type="number"
                      value={formState.maxAttempts}
                      onChange={(e) => setFormState((prev) => ({ ...prev, maxAttempts: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Không giới hạn"
                      min="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Giới hạn số lần học viên có thể làm bài. Để trống nếu không giới hạn. Ví dụ: Nhập "3" để cho phép làm tối đa 3 lần.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Thời Gian Mở <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                      </div>
                    </label>
                    <input
                      type="datetime-local"
                      name="openAt"
                      value={formState.openAt}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, openAt: e.target.value }));
                        if (fieldErrors.openAt || fieldErrors.closeAt) {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.openAt;
                            delete newErrors.closeAt;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.openAt || fieldErrors.closeAt ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Thời điểm bài kiểm tra bắt đầu mở cho học viên. Để trống nếu mở ngay lập tức.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Thời Gian Đóng <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                      </div>
                    </label>
                    <input
                      type="datetime-local"
                      name="closeAt"
                      value={formState.closeAt}
                      onChange={(e) => {
                        setFormState((prev) => ({ ...prev, closeAt: e.target.value }));
                        if (fieldErrors.openAt || fieldErrors.closeAt) {
                          setFieldErrors((prev) => {
                            const newErrors = { ...prev };
                            delete newErrors.openAt;
                            delete newErrors.closeAt;
                            return newErrors;
                          });
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        fieldErrors.openAt || fieldErrors.closeAt ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {fieldErrors.closeAt && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.closeAt}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Thời điểm bài kiểm tra đóng. Phải sau thời gian mở. Để trống nếu không giới hạn thời gian đóng.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Cài đặt nâng cao</h3>
                  <p className="text-xs text-blue-800">
                    Các cài đặt này giúp bạn tùy chỉnh cách thức làm bài và chấm điểm. Bạn có thể chỉnh sửa sau khi tạo bài kiểm tra.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Tùy Chọn Hiển Thị</h3>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-900">Xáo Trộn Câu Hỏi</label>
                      <p className="text-sm text-gray-500">Thứ tự câu hỏi sẽ khác nhau cho mỗi lần làm</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Giúp đảm bảo tính công bằng khi học viên làm bài nhiều lần. Mỗi lần làm bài sẽ có thứ tự câu hỏi khác nhau.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.shuffleQuestions}
                        onChange={(e) => setFormState((prev) => ({ ...prev, shuffleQuestions: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-900">Xáo Trộn Đáp Án</label>
                      <p className="text-sm text-gray-500">Thứ tự đáp án sẽ khác nhau cho mỗi lần làm</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Xáo trộn thứ tự các lựa chọn (A, B, C, D) để tránh học viên nhớ vị trí đáp án đúng.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.shuffleAnswers}
                        onChange={(e) => setFormState((prev) => ({ ...prev, shuffleAnswers: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-900">Hiển Thị Điểm Cho Học Viên</label>
                      <p className="text-sm text-gray-500">Học viên có thể xem điểm sau khi làm bài</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Nếu bật, học viên sẽ thấy điểm số ngay sau khi nộp bài. Nếu tắt, chỉ bạn mới thấy điểm.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.showScoreToStudent}
                        onChange={(e) => setFormState((prev) => ({ ...prev, showScoreToStudent: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Cài Đặt Chấm Điểm</h3>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phương Thức Chấm Điểm
                    </label>
                    <select
                      value={formState.scoringMethod}
                      onChange={(e) => setFormState((prev) => ({ ...prev, scoringMethod: e.target.value as ScoringMethod }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="highest">Điểm cao nhất (Mặc định)</option>
                      <option value="latest">Lần làm gần nhất</option>
                      <option value="average">Điểm trung bình</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      <strong>Điểm cao nhất:</strong> Lấy điểm cao nhất trong các lần làm. <strong>Lần làm gần nhất:</strong> Lấy điểm của lần làm cuối cùng. <strong>Điểm trung bình:</strong> Tính trung bình tất cả các lần làm.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hiển Thị Đáp Án Đúng
                    </label>
                    <select
                      value={formState.showCorrectAnswers}
                      onChange={(e) => setFormState((prev) => ({ ...prev, showCorrectAnswers: e.target.value as ShowAnswers }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="never">Không bao giờ</option>
                      <option value="after_submit">Sau khi nộp bài (Mặc định)</option>
                      <option value="after_close">Sau khi đóng bài</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      <strong>Không bao giờ:</strong> Học viên không bao giờ thấy đáp án đúng. <strong>Sau khi nộp bài:</strong> Hiển thị ngay sau khi nộp. <strong>Sau khi đóng bài:</strong> Chỉ hiển thị sau khi bài kiểm tra đã đóng.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Loại Giới Hạn Thời Gian
                    </label>
                    <select
                      value={formState.timeLimitType}
                      onChange={(e) => setFormState((prev) => ({ ...prev, timeLimitType: e.target.value as TimeLimitType }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="per_attempt">Giới hạn cho mỗi lần làm</option>
                      <option value="global_window">Giới hạn trong khoảng thời gian chung</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {formState.timeLimitType === 'per_attempt'
                        ? 'Mỗi lần làm bài có thời gian riêng. Học viên có thể làm nhiều lần, mỗi lần có thời gian độc lập.'
                        : 'Tất cả các lần làm bài chia sẻ một khoảng thời gian chung. Khi hết thời gian, không thể làm thêm lần nào nữa.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Nộp Bài Muộn</h3>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-900">Cho Phép Nộp Muộn</label>
                      <p className="text-sm text-gray-500">Cho phép học viên nộp bài sau thời gian đóng</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formState.allowLateSubmission}
                        onChange={(e) => setFormState((prev) => ({ ...prev, allowLateSubmission: e.target.checked }))}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {formState.allowLateSubmission && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phần Trăm Phạt Muộn (%)
                      </label>
                      <input
                        type="number"
                        name="latePenaltyPercent"
                        value={formState.latePenaltyPercent}
                        onChange={(e) => {
                          setFormState((prev) => ({ ...prev, latePenaltyPercent: e.target.value }));
                          if (fieldErrors.latePenaltyPercent) {
                            setFieldErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.latePenaltyPercent;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          fieldErrors.latePenaltyPercent ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="0"
                        min="0"
                        max="100"
                      />
                      {fieldErrors.latePenaltyPercent && (
                        <p className="mt-1 text-xs text-red-600 flex items-center">
                          <span className="mr-1">⚠️</span>
                          {fieldErrors.latePenaltyPercent}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Điểm sẽ bị trừ theo phần trăm này khi nộp muộn</p>
                    </div>
                  )}
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
                'Tạo Bài Kiểm Tra'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
