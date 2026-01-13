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
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formState.title.trim()) {
      setError('Tiêu đề bài kiểm tra là bắt buộc.');
      return;
    }

    if (formState.totalPoints) {
      const total = Number(formState.totalPoints);
      if (Number.isNaN(total) || total < 0) {
        setError('Tổng điểm phải là số không âm.');
        return;
      }
    }

    if (formState.passingScore) {
      const passing = Number(formState.passingScore);
      if (Number.isNaN(passing) || passing < 0) {
        setError('Điểm đạt phải là số không âm.');
        return;
      }
    }

    // Validate passingScore <= totalPoints
    if (formState.totalPoints && formState.passingScore) {
      const total = Number(formState.totalPoints);
      const passing = Number(formState.passingScore);
      if (passing > total) {
        setError('Điểm đạt không thể lớn hơn tổng điểm.');
        return;
      }
    }

    if (formState.durationMinutes) {
      const duration = Number(formState.durationMinutes);
      if (Number.isNaN(duration) || duration < 1) {
        setError('Thời lượng tối thiểu là 1 phút.');
        return;
      }
    }

    if (formState.maxAttempts) {
      const maxAttempts = Number(formState.maxAttempts);
      if (Number.isNaN(maxAttempts) || maxAttempts < 1) {
        setError('Số lần làm tối thiểu là 1.');
        return;
      }
    }

    // Validate dates
    if (formState.openAt && formState.closeAt) {
      const openDate = new Date(formState.openAt);
      const closeDate = new Date(formState.closeAt);
      if (openDate >= closeDate) {
        setError('Thời gian mở phải trước thời gian đóng.');
        return;
      }
    }

    if (formState.latePenaltyPercent) {
      const penalty = Number(formState.latePenaltyPercent);
      if (Number.isNaN(penalty) || penalty < 0 || penalty > 100) {
        setError('Phần trăm phạt muộn phải từ 0 đến 100.');
        return;
      }
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
      payload.timeLimitType = 'per_attempt';

      const res = await api.post('/exams', payload);

      if (res.data?.success) {
        onSuccess();
      } else {
        setError(res.data?.message || 'Không thể tạo bài kiểm tra.');
      }
    } catch (err: any) {
      console.error('Failed to create exam:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        'Không thể tạo bài kiểm tra, vui lòng thử lại.';
      setError(message);
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
                    placeholder="Nhập tiêu đề bài kiểm tra"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mô Tả</label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Mô tả về bài kiểm tra"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Trạng Thái</label>
                  <select
                    value={formState.status}
                    onChange={(e) => setFormState((prev) => ({ ...prev, status: e.target.value as ExamStatus }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Đã xuất bản</option>
                    <option value="archived">Đã lưu trữ</option>
                  </select>
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tổng Điểm
                    </label>
                    <input
                      type="number"
                      value={formState.totalPoints}
                      onChange={(e) => setFormState((prev) => ({ ...prev, totalPoints: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="100"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Điểm Đạt
                    </label>
                    <input
                      type="number"
                      value={formState.passingScore}
                      onChange={(e) => setFormState((prev) => ({ ...prev, passingScore: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="60"
                      min="0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Thời Lượng (phút)
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
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Số Lần Làm Tối Đa
                    </label>
                    <input
                      type="number"
                      value={formState.maxAttempts}
                      onChange={(e) => setFormState((prev) => ({ ...prev, maxAttempts: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Không giới hạn"
                      min="1"
                    />
                    <p className="mt-1 text-xs text-gray-500">Để trống nếu không giới hạn</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Thời Gian Mở
                      </div>
                    </label>
                    <input
                      type="datetime-local"
                      value={formState.openAt}
                      onChange={(e) => setFormState((prev) => ({ ...prev, openAt: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Thời Gian Đóng
                      </div>
                    </label>
                    <input
                      type="datetime-local"
                      value={formState.closeAt}
                      onChange={(e) => setFormState((prev) => ({ ...prev, closeAt: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Tùy Chọn Hiển Thị</h3>

                  <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div>
                      <label className="font-medium text-gray-900">Xáo Trộn Câu Hỏi</label>
                      <p className="text-sm text-gray-500">Thứ tự câu hỏi sẽ khác nhau cho mỗi lần làm</p>
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
                      <option value="highest">Điểm cao nhất</option>
                      <option value="latest">Lần làm gần nhất</option>
                      <option value="average">Điểm trung bình</option>
                    </select>
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
                      <option value="after_submit">Sau khi nộp bài</option>
                      <option value="after_close">Sau khi đóng bài</option>
                    </select>
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
                        value={formState.latePenaltyPercent}
                        onChange={(e) => setFormState((prev) => ({ ...prev, latePenaltyPercent: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                        min="0"
                        max="100"
                      />
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
