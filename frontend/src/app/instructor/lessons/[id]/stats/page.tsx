'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Users, CheckCircle, TrendingUp, Clock, Award, Target } from 'lucide-react';

interface QuestionStats {
  questionId: string;
  question: string;
  correctCount: number;
  totalAttempts: number;
  correctRate: number;
  answerDistribution?: Record<string, number>;
}

interface LessonStats {
  totalEnrollments: number;
  totalStarted: number;
  totalCompleted: number;
  completionRate: number;
  totalQuizAttempts: number;
  averageQuizScore: number | null;
  passRate: number | null;
  scoreDistribution: { range: string; count: number }[];
  averageCompletionTime: number | null;
  questionStats: QuestionStats[];
}

interface Lesson {
  _id: string;
  title: string;
  type: string;
  course?: {
    _id: string;
    title: string;
    slug: string;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function LessonStatsContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const lessonId = params?.id;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [stats, setStats] = useState<LessonStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [lessonRes, statsRes] = await Promise.all([
          api.get(`/lessons/${lessonId}`),
          api.get(`/lessons/${lessonId}/stats`),
        ]);

        if (!lessonRes.data?.success || !lessonRes.data.lesson) {
          setError('Không tìm thấy bài học hoặc bạn không có quyền truy cập.');
          return;
        }

        if (!statsRes.data?.success) {
          setError('Không thể tải thống kê bài học.');
          return;
        }

        setLesson(lessonRes.data.lesson);
        setStats(statsRes.data.stats);
      } catch (err) {
        console.error('Failed to load lesson stats:', err);
        setError('Không thể tải dữ liệu thống kê. Vui lòng thử lại.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lessonId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải thống kê...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !lesson || !stats) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Không tìm thấy dữ liệu.'}</p>
            <button
              onClick={() => router.back()}
              className="text-sm text-blue-600 hover:underline"
            >
              ← Quay lại
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => router.push(`/instructor/lessons/${lessonId}/edit`)}
              className="text-sm text-gray-600 hover:text-gray-800 mb-2 inline-block"
            >
              ← Quay lại chỉnh sửa bài học
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
            <p className="text-sm text-gray-600 mt-1">
              Khóa học: {lesson.course?.title || 'N/A'} • Loại: {lesson.type}
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tổng số học viên</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalEnrollments}</p>
                </div>
                <Users className="h-10 w-10 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã hoàn thành</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalCompleted}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.completionRate}% tỉ lệ hoàn thành
                  </p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Đã bắt đầu</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalStarted}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.totalEnrollments > 0
                      ? Math.round((stats.totalStarted / stats.totalEnrollments) * 100)
                      : 0}
                    % đã tham gia
                  </p>
                </div>
                <TrendingUp className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            {stats.averageCompletionTime !== null && (
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-orange-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Thời gian TB</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {formatDuration(stats.averageCompletionTime)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Để hoàn thành</p>
                  </div>
                  <Clock className="h-10 w-10 text-orange-500" />
                </div>
              </div>
            )}

            {stats.averageQuizScore !== null && (
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-indigo-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Điểm TB Quiz</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {stats.averageQuizScore}
                      <span className="text-lg text-gray-500">/100</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {stats.totalQuizAttempts} lượt làm
                    </p>
                  </div>
                  <Award className="h-10 w-10 text-indigo-500" />
                </div>
              </div>
            )}

            {stats.passRate !== null && (
              <div className="bg-white rounded-xl shadow p-6 border-l-4 border-teal-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Tỉ lệ đạt (≥70%)</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">{stats.passRate}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {Math.round((stats.passRate / 100) * stats.totalQuizAttempts)} học viên
                    </p>
                  </div>
                  <Target className="h-10 w-10 text-teal-500" />
                </div>
              </div>
            )}
          </div>

          {/* Charts */}
          {stats.scoreDistribution && stats.scoreDistribution.some((s) => s.count > 0) && (
            <div className="bg-white rounded-xl shadow p-6 mb-8">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Phân phối điểm Quiz</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#3b82f6" name="Số học viên" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Question Stats */}
          {stats.questionStats && stats.questionStats.length > 0 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900">Thống kê từng câu hỏi</h2>
              {stats.questionStats.map((q, index) => (
                <div key={q.questionId} className="bg-white rounded-xl shadow p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Câu {index + 1}: {q.question}
                    </h3>
                    <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
                      <span>
                        Số lượt làm: <strong>{q.totalAttempts}</strong>
                      </span>
                      <span>
                        Trả lời đúng: <strong>{q.correctCount}</strong>
                      </span>
                      <span
                        className={`font-semibold ${
                          q.correctRate >= 70
                            ? 'text-green-600'
                            : q.correctRate >= 50
                            ? 'text-orange-600'
                            : 'text-red-600'
                        }`}
                      >
                        Tỉ lệ đúng: {q.correctRate}%
                      </span>
                    </div>
                  </div>

                  {/* Answer Distribution Chart (for multiple choice) */}
                  {q.answerDistribution && Object.keys(q.answerDistribution).length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-3">
                        Phân phối đáp án:
                      </h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                              <Pie
                                data={Object.entries(q.answerDistribution).map(([answer, count]) => ({
                                  name: answer,
                                  value: count,
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={(entry) => `${entry.name}: ${entry.value}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.keys(q.answerDistribution).map((_, idx) => (
                                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="flex flex-col justify-center space-y-2">
                          {Object.entries(q.answerDistribution)
                            .sort(([, a], [, b]) => b - a)
                            .map(([answer, count], idx) => {
                              const percentage =
                                q.totalAttempts > 0
                                  ? Math.round((count / q.totalAttempts) * 100)
                                  : 0;
                              return (
                                <div key={answer} className="flex items-center gap-3">
                                  <div
                                    className="w-4 h-4 rounded"
                                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                  />
                                  <span className="text-sm text-gray-700 flex-1">
                                    {answer}: <strong>{count}</strong> lượt ({percentage}%)
                                  </span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {stats.totalStarted === 0 && (
            <div className="bg-white rounded-xl shadow p-12 text-center">
              <p className="text-gray-500 text-lg">
                Chưa có học viên nào bắt đầu bài học này.
              </p>
              <p className="text-gray-400 text-sm mt-2">
                Thống kê sẽ xuất hiện khi có học viên tham gia.
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function LessonStatsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <LessonStatsContent />
    </ProtectedRoute>
  );
}

