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
  shuffleQuestions?: boolean;
  shuffleAnswers?: boolean;
  scoringMethod?: 'highest' | 'latest' | 'average';
  showCorrectAnswers?: 'never' | 'after_submit' | 'after_close';
  showScoreToStudent?: boolean;
  allowLateSubmission?: boolean;
  latePenaltyPercent?: number;
  timeLimitType?: 'per_attempt' | 'global_window';
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

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
    showScoreToStudent: true,
    allowLateSubmission: false,
    latePenaltyPercent: '0',
    timeLimitType: 'per_attempt' as 'per_attempt' | 'global_window',
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
            showScoreToStudent: e.showScoreToStudent !== undefined ? e.showScoreToStudent : true,
            allowLateSubmission: e.allowLateSubmission ?? false,
            latePenaltyPercent: e.latePenaltyPercent ? String(e.latePenaltyPercent) : '0',
            timeLimitType: e.timeLimitType || 'per_attempt',
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

    setSaveError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = 'Tiêu đề bài kiểm tra là bắt buộc.';
    }

    if (!form.section) {
      errors.section = 'Vui lòng chọn section.';
    }

    if (form.totalPoints) {
      const total = Number(form.totalPoints);
      if (Number.isNaN(total) || total < 0) {
        errors.totalPoints = 'Tổng điểm phải là số không âm.';
      }
    }

    if (form.passingScore) {
      const passing = Number(form.passingScore);
      if (Number.isNaN(passing) || passing < 0) {
        errors.passingScore = 'Điểm đạt phải là số không âm.';
      }
    }

    // Validate passingScore <= totalPoints
    if (form.totalPoints && form.passingScore) {
      const total = Number(form.totalPoints);
      const passing = Number(form.passingScore);
      if (!Number.isNaN(total) && !Number.isNaN(passing) && passing > total) {
        errors.passingScore = 'Điểm đạt không thể lớn hơn tổng điểm.';
      }
    }

    if (form.durationMinutes) {
      const duration = Number(form.durationMinutes);
      if (Number.isNaN(duration) || duration < 1) {
        errors.durationMinutes = 'Thời lượng tối thiểu là 1 phút.';
      }
    }

    if (form.maxAttempts) {
      const attempts = Number(form.maxAttempts);
      if (Number.isNaN(attempts) || attempts < 1) {
        errors.maxAttempts = 'Số lần làm tối thiểu là 1.';
      }
    }

    // Validate dates
    if (form.openAt && form.closeAt) {
      const openDate = new Date(form.openAt);
      const closeDate = new Date(form.closeAt);
      if (openDate >= closeDate) {
        errors.closeAt = 'Thời gian mở phải trước thời gian đóng.';
      }
    }

    if (form.latePenaltyPercent) {
      const penalty = Number(form.latePenaltyPercent);
      if (Number.isNaN(penalty) || penalty < 0 || penalty > 100) {
        errors.latePenaltyPercent = 'Phần trăm phạt muộn phải từ 0 đến 100.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                      document.querySelector(`#${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
      return;
    }

    try {
      setSaving(true);

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
      payload.showScoreToStudent = form.showScoreToStudent;
      payload.allowLateSubmission = form.allowLateSubmission;
      payload.timeLimitType = form.timeLimitType;
      
      if (form.latePenaltyPercent) {
        const penalty = Number(form.latePenaltyPercent);
        if (!Number.isNaN(penalty) && penalty >= 0 && penalty <= 100) {
          payload.latePenaltyPercent = penalty;
        }
      }

      const res = await api.put(`/exams/${examId}`, payload);
      if (res.data?.success) {
        router.push(`/instructor/courses/${courseId}/curriculum`);
      } else {
        setSaveError(res.data?.message || 'Không thể cập nhật bài kiểm tra.');
      }
    } catch (err: any) {
      console.error('Failed to update exam:', err);
      
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
        setSaveError(
          err?.response?.data?.message ||
            (Array.isArray(err?.response?.data?.errors) &&
              err.response.data.errors[0]?.message) ||
            'Không thể cập nhật bài kiểm tra, vui lòng thử lại.'
        );
      }
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
              onClick={() => router.push(`/instructor/courses/${courseId}/curriculum`)}
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
                href={`/instructor/courses/${courseId}/curriculum`}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại quản lý khóa học
              </Link>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Thông tin cơ bản</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              {/* Error Display */}
              {saveError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Có lỗi xảy ra</h3>
                      <p className="mt-1 text-sm text-red-700">{saveError}</p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  name="section"
                  value={form.section}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, section: e.target.value }));
                    if (fieldErrors.section) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.section;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.section ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
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
                {fieldErrors.section && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.section}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={(e) => {
                    setForm((s) => ({ ...s, title: e.target.value }));
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  disabled={saving}
                  required
                />
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.title}
                  </p>
                )}
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
                    Tổng điểm <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    name="totalPoints"
                    min={0}
                    value={form.totalPoints}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, totalPoints: e.target.value }));
                      if (fieldErrors.totalPoints || fieldErrors.passingScore) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.totalPoints;
                          delete newErrors.passingScore;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.totalPoints ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {fieldErrors.totalPoints && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.totalPoints}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm đạt <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    name="passingScore"
                    min={0}
                    value={form.passingScore}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, passingScore: e.target.value }));
                      if (fieldErrors.passingScore || fieldErrors.totalPoints) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.passingScore;
                          delete newErrors.totalPoints;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.passingScore ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {fieldErrors.passingScore && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.passingScore}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời lượng (phút) <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    name="durationMinutes"
                    min={1}
                    value={form.durationMinutes}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, durationMinutes: e.target.value }));
                      if (fieldErrors.durationMinutes) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.durationMinutes;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.durationMinutes ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {fieldErrors.durationMinutes && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.durationMinutes}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian mở <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="openAt"
                    value={form.openAt}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, openAt: e.target.value }));
                      if (fieldErrors.openAt || fieldErrors.closeAt) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.openAt;
                          delete newErrors.closeAt;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.openAt || fieldErrors.closeAt ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Thời gian đóng <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="closeAt"
                    value={form.closeAt}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, closeAt: e.target.value }));
                      if (fieldErrors.openAt || fieldErrors.closeAt) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.openAt;
                          delete newErrors.closeAt;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.openAt || fieldErrors.closeAt ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    disabled={saving}
                  />
                  {fieldErrors.closeAt && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.closeAt}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số lần làm tối đa <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    name="maxAttempts"
                    min={1}
                    value={form.maxAttempts}
                    onChange={(e) => {
                      setForm((s) => ({ ...s, maxAttempts: e.target.value }));
                      if (fieldErrors.maxAttempts) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.maxAttempts;
                          return newErrors;
                        });
                      }
                    }}
                    className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      fieldErrors.maxAttempts ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Không giới hạn nếu để trống"
                    disabled={saving}
                  />
                  {fieldErrors.maxAttempts && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.maxAttempts}
                    </p>
                  )}
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

                  {/* Show Score To Student */}
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.showScoreToStudent}
                        onChange={(e) =>
                          setForm((s) => ({ ...s, showScoreToStudent: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        disabled={saving}
                      />
                      <span className="ml-2 text-sm text-gray-700">Hiển thị điểm cho học viên</span>
                    </label>
                    <p className="mt-1 ml-6 text-xs text-gray-500">
                      Học viên có thể xem điểm sau khi làm bài
                    </p>
                  </div>

                  {/* Time Limit Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Loại giới hạn thời gian
                    </label>
                    <select
                      value={form.timeLimitType}
                      onChange={(e) =>
                        setForm((s) => ({
                          ...s,
                          timeLimitType: e.target.value as 'per_attempt' | 'global_window',
                        }))
                      }
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={saving}
                    >
                      <option value="per_attempt">Giới hạn cho mỗi lần làm</option>
                      <option value="global_window">Giới hạn trong khoảng thời gian chung</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      {form.timeLimitType === 'per_attempt'
                        ? 'Mỗi lần làm bài có thời gian riêng. Học viên có thể làm nhiều lần, mỗi lần có thời gian độc lập.'
                        : 'Tất cả các lần làm bài chia sẻ một khoảng thời gian chung. Khi hết thời gian, không thể làm thêm lần nào nữa.'}
                    </p>
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
                  href={`/instructor/courses/${courseId}/curriculum`}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Quay lại
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

