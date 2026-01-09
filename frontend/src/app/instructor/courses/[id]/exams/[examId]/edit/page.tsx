'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface ExamDetail {
  _id: string;
  title: string;
  description?: string;
  section: { _id: string; title: string };
  status: 'draft' | 'published' | 'archived';
  totalPoints: number;
  passingScore: number;
  durationMinutes: number;
  openAt?: string | null;
  closeAt?: string | null;
  maxAttempts?: number | null;
  questions: Array<{
    question: {
      _id: string;
      type: string;
      text: string;
      points: number;
    };
    weight: number;
    order: number;
  }>;
}

interface SectionOption {
  _id: string;
  title: string;
}

function ExamEditContent() {
  const params = useParams<{ id: string; examId: string }>();
  const router = useRouter();
  const courseId = params?.id;
  const examId = params?.examId;

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: '',
    description: '',
    section: '',
    status: 'draft' as 'draft' | 'published' | 'archived',
    totalPoints: '',
    passingScore: '',
    durationMinutes: '60',
    openAt: '',
    closeAt: '',
    maxAttempts: '',
    // Advanced settings
    shuffleQuestions: false,
    shuffleAnswers: false,
    scoringMethod: 'highest' as 'highest' | 'latest' | 'average',
    showCorrectAnswers: 'after_submit' as 'never' | 'after_submit' | 'after_close',
    allowLateSubmission: false,
    latePenaltyPercent: '0',
  });

  useEffect(() => {
    if (!courseId || !examId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [examRes, curriculumRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/courses/${courseId}/curriculum`),
        ]);

        if (examRes.data?.success) {
          const e = examRes.data.exam;
          setExam(e);
          setForm({
            title: e.title || '',
            description: e.description || '',
            section: e.section?._id || '',
            status: e.status || 'draft',
            totalPoints: e.totalPoints ? String(e.totalPoints) : '',
            passingScore: e.passingScore ? String(e.passingScore) : '',
            durationMinutes: e.durationMinutes ? String(e.durationMinutes) : '60',
            openAt: e.openAt ? e.openAt.slice(0, 16) : '',
            closeAt: e.closeAt ? e.closeAt.slice(0, 16) : '',
            maxAttempts: e.maxAttempts ? String(e.maxAttempts) : '',
            // Advanced settings
            shuffleQuestions: e.shuffleQuestions ?? false,
            shuffleAnswers: e.shuffleAnswers ?? false,
            scoringMethod: e.scoringMethod || 'highest',
            showCorrectAnswers: e.showCorrectAnswers || 'after_submit',
            allowLateSubmission: e.allowLateSubmission ?? false,
            latePenaltyPercent: e.latePenaltyPercent ? String(e.latePenaltyPercent) : '0',
          });
        } else {
          setError('Không tìm thấy bài kiểm tra.');
        }

        if (curriculumRes.data?.success && Array.isArray(curriculumRes.data.sections)) {
          const sectionsList: SectionOption[] = curriculumRes.data.sections.map((s: any) => ({
            _id: s._id,
            title: s.title,
          }));
          setSections(sectionsList);
        }
      } catch (err: any) {
        console.error('Failed to load exam:', err);
        setError(err?.response?.data?.message || 'Không thể tải thông tin bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, examId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return;

    try {
      setSaving(true);
      setSaveError(null);

      if (!form.section) {
        setSaveError('Vui lòng chọn section.');
        setSaving(false);
        return;
      }

      const payload: any = {
        section: form.section,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
      };

      if (form.totalPoints) {
        const total = Number(form.totalPoints);
        if (!Number.isNaN(total) && total >= 0) {
          payload.totalPoints = total;
        }
      }

      if (form.passingScore) {
        const passing = Number(form.passingScore);
        if (!Number.isNaN(passing) && passing >= 0) {
          payload.passingScore = passing;
        }
      }

      // Validate passingScore <= totalPoints
      if (payload.totalPoints && payload.passingScore) {
        if (payload.passingScore > payload.totalPoints) {
          setSaveError('Điểm đạt không thể lớn hơn tổng điểm.');
          setSaving(false);
          return;
        }
      }

      if (form.durationMinutes) {
        const duration = Number(form.durationMinutes);
        if (!Number.isNaN(duration) && duration >= 1) {
          payload.durationMinutes = duration;
        }
      }

      if (form.maxAttempts) {
        const attempts = Number(form.maxAttempts);
        if (!Number.isNaN(attempts) && attempts >= 1) {
          payload.maxAttempts = attempts;
        }
      }

      if (form.openAt) {
        payload.openAt = new Date(form.openAt).toISOString();
      }
      if (form.closeAt) {
        payload.closeAt = new Date(form.closeAt).toISOString();
      }

      // Advanced settings
      payload.shuffleQuestions = form.shuffleQuestions;
      payload.shuffleAnswers = form.shuffleAnswers;
      payload.scoringMethod = form.scoringMethod;
      payload.showCorrectAnswers = form.showCorrectAnswers;
      payload.allowLateSubmission = form.allowLateSubmission;
      
      if (form.latePenaltyPercent) {
        const penalty = Number(form.latePenaltyPercent);
        if (!Number.isNaN(penalty) && penalty >= 0 && penalty <= 100) {
          payload.latePenaltyPercent = penalty;
        }
      }

      const res = await api.put(`/exams/${examId}`, payload);
      if (res.data?.success) {
        router.push(`/instructor/courses/${courseId}/exams`);
      } else {
        setSaveError(res.data?.message || 'Không thể cập nhật bài kiểm tra.');
      }
    } catch (err: any) {
      console.error('Failed to update exam:', err);
      setSaveError(
        err?.response?.data?.message ||
          (Array.isArray(err?.response?.data?.errors) &&
            err.response.data.errors[0]?.message) ||
          'Không thể cập nhật bài kiểm tra, vui lòng thử lại.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải thông tin bài kiểm tra...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải bài kiểm tra</h2>
            <p className="text-gray-600 mb-4">{error || 'Bài kiểm tra không tồn tại.'}</p>
            <button
              type="button"
              onClick={() => router.push(`/instructor/courses/${courseId}/exams`)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa bài kiểm tra</h1>
              <p className="text-sm text-gray-600 mt-1">{exam.title}</p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/instructor/courses/${courseId}/exams/${examId}/preview`}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Preview
              </Link>
              <Link
                href={`/instructor/courses/${courseId}/exams`}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.section}
                  onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving || sections.length === 0}
                  required
                >
                  {sections.length === 0 ? (
                    <option value="">Chưa có section nào</option>
                  ) : (
                    <>
                      <option value="">-- Chọn section --</option>
                      {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                          {section.title}
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={saving}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tổng điểm
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.totalPoints}
                    onChange={(e) => setForm((s) => ({ ...s, totalPoints: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điểm đạt</label>
                  <input
                    type="number"
                    min={0}
                    value={form.passingScore}
                    onChange={(e) => setForm((s) => ({ ...s, passingScore: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời lượng (phút)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => setForm((s) => ({ ...s, durationMinutes: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian mở
                  </label>
                  <input
                    type="datetime-local"
                    value={form.openAt}
                    onChange={(e) => setForm((s) => ({ ...s, openAt: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian đóng
                  </label>
                  <input
                    type="datetime-local"
                    value={form.closeAt}
                    onChange={(e) => setForm((s) => ({ ...s, closeAt: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lần làm tối đa
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxAttempts}
                    onChange={(e) => setForm((s) => ({ ...s, maxAttempts: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Không giới hạn nếu để trống"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, status: e.target.value as typeof form.status }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                  >
                    <option value="draft">Bản nháp</option>
                    <option value="published">Xuất bản</option>
                    <option value="archived">Lưu trữ</option>
                  </select>
                </div>
              </div>

              {/* Questions section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Câu hỏi ({exam.questions?.length || 0})
                  </h3>
                  <Link
                    href={`/instructor/courses/${courseId}/exams/${examId}/questions`}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Quản lý câu hỏi →
                  </Link>
                </div>
                {exam.questions && exam.questions.length > 0 ? (
                  <div className="space-y-2">
                    {exam.questions.map((q, idx) => (
                      <div
                        key={q.question._id}
                        className="p-3 border rounded-md text-sm text-gray-700"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <span className="font-medium">Câu {idx + 1}:</span>{' '}
                            {q.question.text || 'N/A'}
                          </div>
                          <div className="ml-4 text-xs text-gray-500">
                            {q.question.points} điểm
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Chưa có câu hỏi nào.</p>
                )}
              </div>

              {/* Advanced Settings Section */}
              <div className="pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cài đặt nâng cao</h3>
                
                <div className="space-y-4">
                  {/* Shuffle Options */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Xáo trộn
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.shuffleQuestions}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, shuffleQuestions: e.target.checked }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={saving}
                        />
                        <span className="ml-2 text-sm text-gray-700">Xáo trộn thứ tự câu hỏi</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={form.shuffleAnswers}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, shuffleAnswers: e.target.checked }))
                          }
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          disabled={saving}
                        />
                        <span className="ml-2 text-sm text-gray-700">Xáo trộn thứ tự đáp án</span>
                      </label>
                    </div>
                  </div>

                  {/* Scoring Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phương pháp tính điểm
                    </label>
                    <select
                      value={form.scoringMethod}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          scoringMethod: e.target.value as 'highest' | 'latest' | 'average',
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    >
                      <option value="highest">Điểm cao nhất</option>
                      <option value="latest">Điểm lần làm gần nhất</option>
                      <option value="average">Điểm trung bình</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Áp dụng khi học viên làm nhiều lần
                    </p>
                  </div>

                  {/* Show Correct Answers */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hiển thị đáp án đúng
                    </label>
                    <select
                      value={form.showCorrectAnswers}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          showCorrectAnswers: e.target.value as 'never' | 'after_submit' | 'after_close',
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    >
                      <option value="never">Không bao giờ</option>
                      <option value="after_submit">Sau khi nộp bài</option>
                      <option value="after_close">Sau khi đóng bài kiểm tra</option>
                    </select>
                  </div>

                  {/* Late Submission */}
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.allowLateSubmission}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, allowLateSubmission: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={saving}
                      />
                      <span className="ml-2 text-sm text-gray-700">Cho phép nộp muộn</span>
                    </label>
                    {form.allowLateSubmission && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phần trăm phạt khi nộp muộn (%)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={form.latePenaltyPercent}
                          onChange={(e) =>
                            setForm((s) => ({ ...s, latePenaltyPercent: e.target.value }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0"
                          disabled={saving}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Phần trăm điểm sẽ bị trừ khi nộp sau thời gian đóng (0-100%)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Link
                  href={`/instructor/courses/${courseId}/exams`}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </Link>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
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

export default function ExamEditPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <ExamEditContent />
    </ProtectedRoute>
  );
}

