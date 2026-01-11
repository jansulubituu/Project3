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
  maxAttempts: string;
  openAt: string;
  closeAt: string;
  status: ExamStatus;
  // Advanced settings
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  scoringMethod: 'highest' | 'latest' | 'average';
  showCorrectAnswers: 'never' | 'after_submit' | 'after_close';
  allowLateSubmission: boolean;
  latePenaltyPercent: string;
}

function InstructorCourseExamsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [course, setCourse] = useState<CourseMeta | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSection, setFilterSection] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });

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
    maxAttempts: '',
    openAt: '',
    closeAt: '',
    status: 'draft',
    // Advanced settings defaults
    shuffleQuestions: false,
    shuffleAnswers: false,
    scoringMethod: 'highest',
    showCorrectAnswers: 'after_submit',
    allowLateSubmission: false,
    latePenaltyPercent: '0',
  });


  // Analytics modal state
  const [showAnalytics, setShowAnalytics] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Load exams function
  const loadExams = async (page = 1, isSearch = false) => {
    if (!courseId) return;
    try {
      // Only show full loading on initial load, use searchLoading for search/filter
      if (isSearch) {
        setSearchLoading(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      if (filterStatus !== 'all') {
        params.append('status', filterStatus);
      }
      if (filterSection !== 'all') {
        params.append('section', filterSection);
      }
      params.append('page', String(page));
      params.append('limit', '10');

      const examsRes = await api.get(`/exams/course/${courseId}?${params.toString()}`);
      if (examsRes.data?.success) {
        const list: ExamItem[] = (examsRes.data.exams || []).map((e: any) => ({
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
        if (examsRes.data.pagination) {
          setPagination(examsRes.data.pagination);
          // Sync currentPage state with pagination from API
          setCurrentPage(examsRes.data.pagination.currentPage);
        }
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
      setError('Không thể tải danh sách bài kiểm tra.');
    } finally {
      if (isSearch) {
        setSearchLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

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
          setCourse({
            _id: c._id,
            title: c.title,
            slug: c.slug,
          });
        } else {
          setError('Không tìm thấy khóa học.');
        }

        // Load sections
        if (curriculumRes.data?.success && Array.isArray(curriculumRes.data.sections)) {
          const sectionsList: SectionOption[] = curriculumRes.data.sections.map((s: any) => ({
            _id: s._id,
            title: s.title,
          }));
          setSections(sectionsList);
        }

        // Load exams
        await loadExams(1);
      } catch (err) {
        console.error('Failed to load data:', err);
        setError('Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  // Reload exams when filters or search change (without page reload)
  useEffect(() => {
    if (courseId && !loading) {
      // Only trigger search if not initial load
      const timer = setTimeout(() => {
        setCurrentPage(1);
        loadExams(1, true); // isSearch = true to use searchLoading instead of loading
      }, 300); // Debounce search
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, filterStatus, filterSection]);

  const reloadExams = async () => {
    await loadExams(currentPage);
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
      maxAttempts: '',
      openAt: '',
      closeAt: '',
      status: 'draft',
      // Advanced settings defaults
      shuffleQuestions: false,
      shuffleAnswers: false,
      scoringMethod: 'highest',
      showCorrectAnswers: 'after_submit',
      allowLateSubmission: false,
      latePenaltyPercent: '0',
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

      if (form.maxAttempts) {
        const maxAttempts = Number(form.maxAttempts);
        if (Number.isNaN(maxAttempts) || maxAttempts < 1) {
          setCreateError('Số lần làm tối thiểu là 1.');
          setCreating(false);
          return;
        }
        payload.maxAttempts = maxAttempts;
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
              <Link
                href={`/instructor/courses/${courseId}/exams/templates`}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-medium hover:bg-gray-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Templates
              </Link>
              <Link
                href={`/instructor/courses/${courseId}/exams/generate`}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-700 hover:to-blue-700"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                Tạo bằng AI
              </Link>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                + Tạo thủ công
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

          {/* Search and Filter */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm theo tiêu đề, mô tả..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {searchLoading ? (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                    </div>
                  ) : (
                    <svg
                      className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Filter by Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
              </div>

              {/* Filter by Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section
                </label>
                <select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Tất cả sections</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Exams list */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">Danh sách bài kiểm tra</h2>
              {!loading && (
                <p className="text-xs text-gray-500">
                  {pagination.totalItems > 0 ? (
                    <>
                      Hiển thị <span className="font-semibold">{exams.length}</span> /{' '}
                      <span className="font-semibold">{pagination.totalItems}</span> bài kiểm tra
                    </>
                  ) : (
                    'Chưa có bài kiểm tra nào'
                  )}
                </p>
              )}
            </div>

            {loading ? (
              <div className="px-5 py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-sm text-gray-500">Đang tải...</p>
              </div>
            ) : searchLoading ? (
              <div className="px-5 py-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto" />
                <p className="mt-2 text-xs text-gray-500">Đang tìm kiếm...</p>
              </div>
            ) : exams.length === 0 ? (
              <div className="px-5 py-6 text-sm text-gray-500 text-center">
                {searchQuery || filterStatus !== 'all' || filterSection !== 'all'
                  ? 'Không tìm thấy bài kiểm tra nào phù hợp với bộ lọc.'
                  : 'Chưa có bài kiểm tra nào cho khóa học này. Hãy tạo bài kiểm tra đầu tiên.'}
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
                      <Link
                        href={`/instructor/courses/${courseId}/exams/${exam._id}/analytics`}
                        className="px-3 py-1.5 rounded-md border border-blue-200 text-blue-700 hover:bg-blue-50 inline-block text-center"
                      >
                        Analytics
                      </Link>
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

            {/* Pagination */}
            {!loading && pagination.totalItems > 0 && (
              <div className="px-5 py-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50">
                <div className="text-sm text-gray-700">
                  Hiển thị{' '}
                  <span className="font-medium">
                    {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}
                  </span>{' '}
                  -{' '}
                  <span className="font-medium">
                    {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}
                  </span>{' '}
                  trong tổng số <span className="font-medium">{pagination.totalItems}</span> bài kiểm tra
                </div>
                {pagination.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newPage = currentPage - 1;
                        setCurrentPage(newPage);
                        loadExams(newPage, true);
                      }}
                      disabled={currentPage === 1 || searchLoading}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Trước
                    </button>
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => {
                              setCurrentPage(pageNum);
                              loadExams(pageNum, true);
                            }}
                            disabled={searchLoading}
                            className={`px-3 py-2 text-sm font-medium rounded-md min-w-[2.5rem] ${
                              currentPage === pageNum
                                ? 'bg-blue-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => {
                        const newPage = currentPage + 1;
                        setCurrentPage(newPage);
                        loadExams(newPage, true);
                      }}
                      disabled={currentPage === pagination.totalPages || searchLoading}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Sau →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create exam modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-5 py-3 border-b flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">Tạo bài kiểm tra mới</h2>
              <button
                type="button"
                onClick={() => !creating && setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              <form id="create-exam-form" onSubmit={handleCreateExam} className="px-5 py-4 space-y-4">
                {/* Error message at top */}
                {createError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-600 font-medium">{createError}</p>
                  </div>
                )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    Thời lượng (phút) <span className="text-red-500">*</span>
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
                    disabled={creating}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Để trống nếu không giới hạn số lần làm
                  </p>
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

              {/* Advanced Settings Section */}
              <div className="border-t pt-4 mt-4">
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
                          disabled={creating}
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
                          disabled={creating}
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
                      disabled={creating}
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
                      disabled={creating}
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
                        disabled={creating}
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
                          disabled={creating}
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          Phần trăm điểm sẽ bị trừ khi nộp sau thời gian đóng (0-100%)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
            </div>
            {/* Fixed footer with buttons */}
            <div className="px-5 py-3 border-t bg-gray-50 flex justify-end gap-2 flex-shrink-0">
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
                form="create-exam-form"
                className="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={creating}
              >
                {creating ? 'Đang tạo...' : 'Tạo bài kiểm tra'}
              </button>
            </div>
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


