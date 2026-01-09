'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, FileText, Calendar, Award, AlertCircle } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface ExamOverview {
  id: string;
  title: string;
  description?: string;
  durationMinutes: number;
  totalPoints: number;
  passingScore: number;
  openAt?: string | null;
  closeAt?: string | null;
  maxAttempts?: number | null;
  isOpen: boolean;
  isClosed: boolean;
  canStart: boolean;
}

interface Attempt {
  _id: string;
  startedAt: string;
  submittedAt?: string | null;
  status: 'in_progress' | 'submitted' | 'expired' | 'abandoned';
  score?: number;
  maxScore?: number;
  passed?: boolean;
}

interface AttemptsInfo {
  total: number;
  submitted: number;
  remaining: number | null;
  latest: Attempt | null;
}

function ExamOverviewContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const examId = params.examId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamOverview | null>(null);
  const [attempts, setAttempts] = useState<AttemptsInfo | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/exams/${examId}/overview`);
        if (res.data?.success) {
          setExam(res.data.exam);
          setAttempts(res.data.attempts);
        } else {
          setError(res.data?.message || 'Không thể tải thông tin bài kiểm tra.');
        }
      } catch (err: any) {
        console.error('Failed to load exam overview:', err);
        setError(err?.response?.data?.message || 'Không thể tải thông tin bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };

    if (examId) {
      loadOverview();
    }
  }, [examId]);

  const handleStartExam = async () => {
    if (!exam || !exam.canStart) return;

    try {
      setStarting(true);
      const res = await api.post(`/exams/${examId}/start`);
      if (res.data?.success) {
        const attemptId = res.data.attempt._id;
        router.push(`/courses/${slug}/exams/${examId}/take/${attemptId}`);
      } else {
        alert(res.data?.message || 'Không thể bắt đầu làm bài.');
      }
    } catch (err: any) {
      console.error('Failed to start exam:', err);
      alert(err?.response?.data?.message || 'Không thể bắt đầu làm bài, vui lòng thử lại.');
    } finally {
      setStarting(false);
    }
  };

  const handleResumeExam = (attemptId: string) => {
    router.push(`/courses/${slug}/exams/${examId}/take/${attemptId}`);
  };

  const handleViewResult = (attemptId: string) => {
    router.push(`/courses/${slug}/exams/${examId}/attempts/${attemptId}`);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours} giờ ${mins} phút`;
    }
    return `${mins} phút`;
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
            <Link
              href={`/courses/${slug}/learn`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại khóa học
            </Link>
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
          <div className="mb-6">
            <Link
              href={`/courses/${slug}/learn`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              ← Quay lại khóa học
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{exam.title}</h1>
            {exam.description && (
              <p className="text-gray-600">{exam.description}</p>
            )}
          </div>

          {/* Status Banner */}
          {!exam.isOpen && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Bài kiểm tra chưa mở</h3>
                <p className="text-sm text-yellow-800">
                  {exam.openAt
                    ? `Bài kiểm tra sẽ mở vào: ${formatDate(exam.openAt)}`
                    : 'Thời gian mở chưa được thiết lập'}
                </p>
              </div>
            </div>
          )}

          {exam.isClosed && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-900 mb-1">Bài kiểm tra đã đóng</h3>
                <p className="text-sm text-red-800">
                  {exam.closeAt
                    ? `Bài kiểm tra đã đóng vào: ${formatDate(exam.closeAt)}`
                    : 'Bài kiểm tra đã đóng'}
                </p>
              </div>
            </div>
          )}

          {/* Exam Info */}
          <div className="bg-white rounded-lg shadow border border-gray-100 mb-6">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Thông tin bài kiểm tra</h2>
            </div>
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Thời gian làm bài</p>
                    <p className="text-sm text-gray-900">{formatDuration(exam.durationMinutes)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Award className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Tổng điểm</p>
                    <p className="text-sm text-gray-900">{exam.totalPoints} điểm</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Điểm đạt</p>
                    <p className="text-sm text-gray-900">{exam.passingScore} điểm</p>
                  </div>
                </div>
                {exam.maxAttempts && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Số lần làm bài</p>
                      <p className="text-sm text-gray-900">
                        {attempts && attempts.remaining !== null
                          ? `Còn lại: ${attempts.remaining}/${exam.maxAttempts} lần`
                          : `Tối đa: ${exam.maxAttempts} lần`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {(exam.openAt || exam.closeAt) && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2">
                      {exam.openAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Thời gian mở</p>
                          <p className="text-sm text-gray-900">{formatDate(exam.openAt)}</p>
                        </div>
                      )}
                      {exam.closeAt && (
                        <div>
                          <p className="text-sm font-medium text-gray-700">Thời gian đóng</p>
                          <p className="text-sm text-gray-900">{formatDate(exam.closeAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Attempts History */}
          {attempts && attempts.total > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-100 mb-6">
              <div className="px-5 py-3 border-b">
                <h2 className="text-sm font-semibold text-gray-900">Lịch sử làm bài</h2>
              </div>
              <div className="px-5 py-4">
                <div className="space-y-3">
                  {attempts.latest && (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Lần làm bài gần nhất
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Bắt đầu: {formatDate(attempts.latest.startedAt)}
                            {attempts.latest.submittedAt && (
                              <> · Nộp bài: {formatDate(attempts.latest.submittedAt)}</>
                            )}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            attempts.latest.status === 'submitted'
                              ? 'bg-green-100 text-green-700'
                              : attempts.latest.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {attempts.latest.status === 'submitted'
                            ? 'Đã nộp'
                            : attempts.latest.status === 'in_progress'
                            ? 'Đang làm'
                            : attempts.latest.status}
                        </span>
                      </div>
                      {attempts.latest.status === 'submitted' &&
                        attempts.latest.score !== undefined && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Điểm số</p>
                                <p className="text-lg font-semibold text-gray-900">
                                  {attempts.latest.score}/{attempts.latest.maxScore !== undefined ? attempts.latest.maxScore : exam.totalPoints}
                                </p>
                              </div>
                              {attempts.latest.passed !== undefined && (
                                <div>
                                  <p className="text-xs text-gray-500">Kết quả</p>
                                  <p
                                    className={`text-lg font-semibold ${
                                      attempts.latest.passed
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                    }`}
                                  >
                                    {attempts.latest.passed ? 'Đạt' : 'Không đạt'}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      <div className="mt-3 flex gap-2">
                        {attempts.latest.status === 'in_progress' && (
                          <button
                            type="button"
                            onClick={() => handleResumeExam(attempts.latest!._id)}
                            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                          >
                            Tiếp tục làm bài
                          </button>
                        )}
                        {attempts.latest.status === 'submitted' && (
                          <button
                            type="button"
                            onClick={() => handleViewResult(attempts.latest!._id)}
                            className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50"
                          >
                            Xem kết quả
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="text-sm text-gray-600">
                    Tổng số lần làm bài: {attempts.submitted} đã nộp
                    {attempts.remaining !== null && `, ${attempts.remaining} còn lại`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Start Button */}
          {exam.canStart && attempts && attempts.remaining !== null && attempts.remaining > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Sẵn sàng bắt đầu làm bài?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Bạn sẽ có {formatDuration(exam.durationMinutes)} để hoàn thành bài kiểm tra này.
                  {exam.maxAttempts && ` Bạn còn ${attempts.remaining} lần làm bài.`}
                </p>
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={starting}
                  className="inline-flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {starting ? 'Đang bắt đầu...' : 'Bắt đầu làm bài'}
                </button>
              </div>
            </div>
          )}

          {/* No more attempts message */}
          {exam.maxAttempts && attempts && attempts.remaining !== null && attempts.remaining === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="text-center">
                <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-red-900 mb-2">
                  Đã hết số lần làm bài
                </h3>
                <p className="text-sm text-red-800 mb-4">
                  Bạn đã hoàn thành tất cả {exam.maxAttempts} lần làm bài kiểm tra này.
                  {attempts.submitted > 0 && (
                    <span className="block mt-2">
                      Bạn có thể xem lại kết quả các lần làm bài ở phần lịch sử bên trên.
                    </span>
                  )}
                </p>
                {attempts.latest && attempts.latest.status === 'submitted' && (
                  <button
                    type="button"
                    onClick={() => handleViewResult(attempts.latest!._id)}
                    className="inline-flex items-center px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                  >
                    Xem kết quả lần làm gần nhất
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExamOverviewPage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
      <ExamOverviewContent />
    </ProtectedRoute>
  );
}

