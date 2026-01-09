'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type ExamStatus = 'draft' | 'published' | 'archived';

interface CourseMeta {
  _id: string;
  title: string;
  slug: string;
}

interface ExamItem {
  _id: string;
  title: string;
  status: ExamStatus;
  totalPoints: number;
  passingScore: number;
  durationMinutes: number;
  openAt?: string | null;
  closeAt?: string | null;
  maxAttempts?: number | null;
  createdAt: string;
  section?: { _id: string; title: string } | null;
}

interface SectionOption {
  _id: string;
  title: string;
}

interface CreateExamFormState {
  title: string;
  description: string;
  section: string;
  totalPoints: string;
  passingScore: string;
  durationMinutes: string;
  openAt: string;
  closeAt: string;
  status: ExamStatus;
}

function InstructorCourseExamsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateExamFormState>({
    title: '',
    description: '',
    section: '',
    totalPoints: '',
    passingScore: '',
    durationMinutes: '60',
    openAt: '',
    closeAt: '',
    status: 'draft',
  });


  // Analytics modal state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [courseRes, examsRes, curriculumRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get(`/exams/course/${courseId}`),
          api.get(`/courses/${courseId}/curriculum`),
        ]);

        if (courseRes.data?.success) {
          const c = courseRes.data.course;
          setCourse({
            _id: c._id,
            title: c.title,
            slug: c.slug,
          });
        } else {
          setError('Không tìm thấy khóa học.');
        }

        if (examsRes.data?.success && Array.isArray(examsRes.data.exams)) {
          const list: ExamItem[] = examsRes.data.exams.map((e: any) => ({
            _id: e._id,
            title: e.title,
            status: e.status,
            totalPoints: e.totalPoints ?? 0,
            passingScore: e.passingScore ?? 0,
            durationMinutes: e.durationMinutes ?? 60,
            openAt: e.openAt,
            closeAt: e.closeAt,
            maxAttempts: e.maxAttempts ?? null,
            createdAt: e.createdAt,
            section: e.section || null,
          }));
          setExams(list);
        }

        // Load sections
        if (curriculumRes.data?.success && Array.isArray(curriculumRes.data.sections)) {
          const sectionsList: SectionOption[] = curriculumRes.data.sections.map((s: any) => ({
            _id: s._id,
            title: s.title,
          }));
          setSections(sectionsList);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
        setError('Không thể tải danh sách bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  const reloadExams = async () => {
    if (!courseId) return;
    const examsRes = await api.get(`/exams/course/${courseId}`);
    if (examsRes.data?.success && Array.isArray(examsRes.data.exams)) {
      const list: ExamItem[] = examsRes.data.exams.map((e: any) => ({
        _id: e._id,
        title: e.title,
        status: e.status,
        totalPoints: e.totalPoints ?? 0,
        passingScore: e.passingScore ?? 0,
        durationMinutes: e.durationMinutes ?? 60,
        openAt: e.openAt,
        closeAt: e.closeAt,
        maxAttempts: e.maxAttempts ?? null,
        createdAt: e.createdAt,
        section: e.section || null,
      }));
      setExams(list);
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return '—';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatDuration = (minutes: number) => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes} phút`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (mins === 0) return `${hours} giờ`;
    return `${hours} giờ ${mins} phút`;
  };

  const handleOpenCreateModal = () => {
    setForm({
      title: '',
      description: '',
      section: sections.length > 0 ? sections[0]._id : '',
      totalPoints: '',
      passingScore: '',
      durationMinutes: '60',
      openAt: '',
      closeAt: '',
      status: 'draft',
    });
    setCreateError(null);
    setShowCreateModal(true);
  };

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      setCreating(true);
      setCreateError(null);

      if (!form.section) {
        setCreateError('Vui lòng chọn section cho bài kiểm tra.');
        setCreating(false);
        return;
      }

      const payload: any = {
        course: courseId,
        section: form.section,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        status: form.status,
      };

      if (!payload.title) {
        setCreateError('Tiêu đề bài kiểm tra là bắt buộc.');
        setCreating(false);
        return;
      }

      if (form.totalPoints) {
        const total = Number(form.totalPoints);
        if (Number.isNaN(total) || total < 0) {
          setCreateError('Tổng điểm phải là số không âm.');
          setCreating(false);
          return;
        }
        payload.totalPoints = total;
      }

      if (form.passingScore) {
        const passing = Number(form.passingScore);
        if (Number.isNaN(passing) || passing < 0) {
          setCreateError('Điểm đạt phải là số không âm.');
          setCreating(false);
          return;
        }
        payload.passingScore = passing;
      }

      // Validate passingScore <= totalPoints
      if (payload.totalPoints && payload.passingScore) {
        if (payload.passingScore > payload.totalPoints) {
          setCreateError('Điểm đạt không thể lớn hơn tổng điểm.');
          setCreating(false);
          return;
        }
      }

      if (form.durationMinutes) {
        const duration = Number(form.durationMinutes);
        if (Number.isNaN(duration) || duration < 1) {
          setCreateError('Thời lượng tối thiểu là 1 phút.');
          setCreating(false);
          return;
        }
        payload.durationMinutes = duration;
      }

      if (form.openAt) {
        payload.openAt = new Date(form.openAt).toISOString();
      }
      if (form.closeAt) {
        payload.closeAt = new Date(form.closeAt).toISOString();
      }

      const res = await api.post('/exams', payload);
      if (!res.data?.success) {
        const message =
          res.data?.message ||
          res.data?.error ||
          (Array.isArray(res.data?.errors) && res.data.errors[0]?.message) ||
          'Không thể tạo bài kiểm tra.';
        setCreateError(message);
        setCreating(false);
        return;
      }

      await reloadExams();

      setShowCreateModal(false);
    } catch (err: any) {
      console.error('Failed to create exam:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.message) ||
        'Không thể tạo bài kiểm tra, vui lòng thử lại.';
      setCreateError(message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteExam = async (examId: string) => {
    const confirmed = window.confirm('Bạn có chắc muốn xóa bài kiểm tra này? Hành động này không thể hoàn tác.');
    if (!confirmed) return;
    try {
      const res = await api.delete(`/exams/${examId}`);
      if (res.data?.success) {
        await reloadExams();
      } else {
        alert(res.data?.message || 'Không thể xóa bài kiểm tra.');
      }
    } catch (err: any) {
      console.error('Failed to delete exam:', err);
      alert(err?.response?.data?.message || 'Không thể xóa bài kiểm tra, vui lòng thử lại.');
    }
  };

  const handleAnalytics = async (examId: string) => {
    try {
      setShowAnalytics(true);
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      setAnalyticsData(null);
      const res = await api.get(`/exams/${examId}/analytics`);
      if (res.data?.success) {
        setAnalyticsData(res.data.analytics);
      } else {
        setAnalyticsError(res.data?.message || 'Không thể tải analytics.');
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
      setAnalyticsError('Không thể tải analytics, vui lòng thử lại.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải danh sách bài kiểm tra...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải bài kiểm tra</h2>
            <p className="text-gray-600 mb-4">
              {error || 'Bạn không có quyền hoặc khóa học không tồn tại.'}
            </p>
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
                Quản lý bài kiểm tra: {course.title}
              </h1>
              <p className="text-sm text-gray-600">
                Tạo và quản lý các bài kiểm tra cho khóa học này. Bài kiểm tra có thể cấu hình thời
                gian mở/đóng và thời lượng làm bài riêng.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                + Tạo bài kiểm tra
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

          {/* Exams list */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Danh sách bài kiểm tra</h2>
              {exams.length > 0 && (
                <p className="text-xs text-gray-500">
                  Có <span className="font-semibold">{exams.length}</span> bài kiểm tra.
                </p>
              )}
            </div>

            {exams.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-500">
                Chưa có bài kiểm tra nào cho khóa học này. Hãy tạo bài kiểm tra đầu tiên.
              </div>
            ) : (
              <div className="divide-y">
                {exams.map((exam) => (
                  <div
                    key={exam._id}
                    className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900">{exam.title}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            exam.status === 'published'
                              ? 'bg-green-100 text-green-700'
                              : exam.status === 'draft'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {exam.status === 'published'
                            ? 'Đã xuất bản'
                            : exam.status === 'draft'
                            ? 'Bản nháp'
                            : 'Đã lưu trữ'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-600">
                        Tổng điểm:{' '}
                        <span className="font-semibold text-gray-900">{exam.totalPoints}</span> ·
                        Điểm đạt:{' '}
                        <span className="font-semibold text-gray-900">{exam.passingScore}</span> ·
                        Thời lượng: {formatDuration(exam.durationMinutes)}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Mở:&nbsp;
                        <span>{formatDateTime(exam.openAt)}</span>
                        &nbsp;· Đóng:&nbsp;
                        <span>{formatDateTime(exam.closeAt)}</span>
                        {exam.maxAttempts && (
                          <>
                            &nbsp;· Số lần làm tối đa:{' '}
                            <span className="font-semibold text-gray-900">
                              {exam.maxAttempts}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Link
                        href={`/courses/${course.slug}`}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Xem như học viên
                      </Link>
                      <Link
                        href={`/instructor/courses/${courseId}/exams/${exam._id}/edit`}
                        className="px-3 py-1.5 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Sửa
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAnalytics(exam._id)}
                        className="px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50"
                      >
                        Analytics
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam._id)}
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
      </main>

      {/* Create exam modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Tạo bài kiểm tra mới</h2>
              <button
                type="button"
                onClick={() => !creating && setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.section}
                  onChange={(e) => setForm((s) => ({ ...s, section: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creating || sections.length === 0}
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
                {sections.length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Vui lòng tạo section trước khi tạo exam.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề bài kiểm tra <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: Bài kiểm tra giữa khóa"
                  disabled={creating}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả (không bắt buộc)
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={creating}
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
                    placeholder="Tự tính nếu để trống"
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm đạt
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.passingScore}
                    onChange={(e) => setForm((s) => ({ ...s, passingScore: e.target.value }))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0 nếu để trống"
                    disabled={creating}
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
                    disabled={creating}
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
                    disabled={creating}
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
                    disabled={creating}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, status: e.target.value as ExamStatus }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={creating}
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Xuất bản ngay</option>
                  <option value="archived">Lưu trữ</option>
                </select>
              </div>

              {createError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {createError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => !creating && setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={creating}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={creating}
                >
                  {creating ? 'Đang tạo...' : 'Tạo bài kiểm tra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics modal */}
      {showAnalytics && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Analytics bài kiểm tra</h2>
              <button
                type="button"
                onClick={() => !analyticsLoading && setShowAnalytics(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-4">
              {analyticsLoading && (
                <p className="text-sm text-gray-600">Đang tải dữ liệu phân tích...</p>
              )}
              {analyticsError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {analyticsError}
                </p>
              )}

              {analyticsData && (
                <div className="space-y-3 text-sm text-gray-800">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-md border bg-gray-50">
                      <p className="text-xs text-gray-500">Tổng số lượt nộp</p>
                      <p className="text-lg font-semibold">{analyticsData.attempts?.total ?? 0}</p>
                    </div>
                    <div className="p-3 rounded-md border bg-gray-50">
                      <p className="text-xs text-gray-500">Tỷ lệ đỗ</p>
                      <p className="text-lg font-semibold">
                        {analyticsData.attempts?.passRate ?? 0}%
                      </p>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border">
                    <p className="text-sm font-semibold mb-1">Điểm số</p>
                    <p className="text-xs text-gray-600 mb-1">
                      Trung bình: <strong>{analyticsData.scores?.average ?? 0}</strong> /{' '}
                      {analyticsData.exam?.totalPoints ?? 0}
                    </p>
                    <div className="text-xs text-gray-600">
                      Phân bố:
                      <ul className="list-disc list-inside">
                        <li>0-25%: {analyticsData.scores?.distribution?.['0-25%'] ?? 0}</li>
                        <li>25-50%: {analyticsData.scores?.distribution?.['25-50%'] ?? 0}</li>
                        <li>50-75%: {analyticsData.scores?.distribution?.['50-75%'] ?? 0}</li>
                        <li>75-100%: {analyticsData.scores?.distribution?.['75-100%'] ?? 0}</li>
                      </ul>
                    </div>
                  </div>

                  <div className="p-3 rounded-md border">
                    <p className="text-sm font-semibold mb-1">Thời gian làm bài</p>
                    <p className="text-xs text-gray-600">
                      Trung bình: <strong>{analyticsData.time?.averageMinutes ?? 0}</strong> phút
                    </p>
                  </div>

                  {Array.isArray(analyticsData.questions) && analyticsData.questions.length > 0 && (
                    <div className="p-3 rounded-md border">
                      <p className="text-sm font-semibold mb-2">Độ khó từng câu hỏi</p>
                      <div className="space-y-2 text-xs text-gray-700">
                        {analyticsData.questions.map((q: any, idx: number) => (
                          <div
                            key={`${q.questionId}-${idx}`}
                            className="flex items-center justify-between border rounded-md px-3 py-2"
                          >
                            <span>Câu hỏi: {q.questionId}</span>
                            <span>
                              Độ khó: <strong>{q.difficultyIndex ?? 0}%</strong> · Trả lời:{' '}
                              {q.totalAnswers ?? 0}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function InstructorCourseExamsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <InstructorCourseExamsContent />
    </ProtectedRoute>
  );
}


