'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  BarChart3,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface AnalyticsData {
  exam: {
    id: string;
    title: string;
    totalPoints: number;
    passingScore: number;
  };
  attempts: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  scores: {
    average: number;
    max: number;
    min: number;
    distribution: {
      '0-25%': number;
      '25-50%': number;
      '50-75%': number;
      '75-100%': number;
    };
  };
  time: {
    averageMinutes: number;
    minMinutes: number;
    maxMinutes: number;
  };
  questions: Array<{
    questionId: string;
    totalAnswers: number;
    correctCount: number;
    difficultyIndex: number;
  }>;
}

interface StudentPerformance {
  studentId: string;
  studentName: string;
  studentEmail: string;
  totalAttempts: number;
  bestScore: number;
  bestPercentage: number;
  latestAttempt: string;
  attempts: Array<{
    attemptId: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    submittedAt: string;
    timeSpentMinutes: number;
  }>;
}

function ExamAnalyticsContent() {
  const params = useParams<{ id: string; examId: string }>();
  const courseId = params?.id;
  const examId = params?.examId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [students, setStudents] = useState<StudentPerformance[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [showStudents, setShowStudents] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);

  useEffect(() => {
    if (!examId) return;
    loadAnalytics();
  }, [examId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/exams/${examId}/analytics`);
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
        await loadQuestions(res.data.analytics.questions);
      } else {
        setError(res.data?.message || 'Không thể tải analytics.');
      }
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.message || 'Không thể tải analytics.');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (questionStats: any[]) => {
    try {
      const questionIds = questionStats.map((q: any) => q.questionId);
      if (questionIds.length === 0) return;

      const res = await api.get(`/exams/${examId}`);
      if (res.data?.success && res.data.exam?.questions) {
        const examQuestions = res.data.exam.questions;
        const questionsWithStats = examQuestions.map((qRef: any, index: number) => {
          const question = qRef.question;
          const stats = questionStats.find((s: any) => s.questionId.toString() === question._id.toString());
          return {
            order: index + 1,
            questionId: question._id,
            text: question.text,
            type: question.type,
            difficulty: question.difficulty,
            points: qRef.weight || question.points || 1,
            ...stats,
          };
        });
        setQuestions(questionsWithStats);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const loadStudents = async () => {
    try {
      setLoadingStudents(true);
      const res = await api.get(`/exams/${examId}/analytics/students`);
      if (res.data?.success) {
        setStudents(res.data.students || []);
        setShowStudents(true);
      }
    } catch (err: any) {
      console.error('Failed to load students:', err);
      alert('Không thể tải danh sách học viên: ' + (err?.response?.data?.message || 'Unknown error'));
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleExport = async (format: 'csv' | 'json' = 'csv') => {
    try {
      const res = await api.get(`/exams/${examId}/analytics/export?format=${format}`, {
        responseType: 'blob',
      });

      const blob = new Blob([res.data], {
        type: format === 'csv' ? 'text/csv' : 'application/json',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `exam-${examId}-analytics.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Failed to export:', err);
      alert('Không thể export dữ liệu: ' + (err?.response?.data?.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải analytics...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải analytics</h2>
            <p className="text-gray-600 mb-4">{error || 'Dữ liệu không tồn tại'}</p>
            <Link
              href={`/instructor/courses/${courseId}/curriculum`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Quay lại
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Prepare chart data
  const scoreDistributionData = [
    { name: '0-25%', value: analytics.scores.distribution['0-25%'], color: '#ef4444' },
    { name: '25-50%', value: analytics.scores.distribution['25-50%'], color: '#f59e0b' },
    { name: '50-75%', value: analytics.scores.distribution['50-75%'], color: '#3b82f6' },
    { name: '75-100%', value: analytics.scores.distribution['75-100%'], color: '#10b981' },
  ];

  const passFailData = [
    { name: 'Passed', value: analytics.attempts.passed, color: '#10b981' },
    { name: 'Failed', value: analytics.attempts.failed, color: '#ef4444' },
  ];

  // Note: questionDifficultyData can be used for future LineChart if needed

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/instructor/courses/${courseId}/curriculum`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại danh sách exam
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Exam Analytics</h1>
                  <p className="text-sm text-gray-600 mt-1">{analytics.exam.title}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExport('csv')}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </button>
                <button
                  onClick={() => handleExport('json')}
                  className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export JSON
                </button>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Attempts</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{analytics.attempts.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Pass Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.attempts.passRate.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.scores.average.toFixed(1)} / {analytics.scores.max}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow border border-gray-100 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Avg Time</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {analytics.time.averageMinutes.toFixed(0)} min
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Pass/Fail Pie Chart */}
            <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Pass/Fail Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={passFailData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {passFailData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Score Distribution */}
            <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Score Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={scoreDistributionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#3b82f6">
                    {scoreDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Question-Level Analytics */}
          {questions.length > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Question-Level Analytics</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Answers</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correct Rate</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Difficulty Index</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {questions.map((q) => (
                      <tr key={q.questionId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{q.order}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{q.text}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {q.type === 'single_choice'
                            ? 'Single'
                            : q.type === 'multiple_choice'
                            ? 'Multiple'
                            : 'Short'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{q.totalAnswers || 0}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{q.correctCount || 0}</td>
                        <td className="px-4 py-3 text-sm">
                          {q.totalAnswers > 0 ? (
                            <span
                              className={`font-semibold ${
                                (q.correctCount / q.totalAnswers) * 100 >= 70
                                  ? 'text-green-600'
                                  : (q.correctCount / q.totalAnswers) * 100 >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {Math.round((q.correctCount / q.totalAnswers) * 100)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`font-semibold ${
                              q.difficultyIndex >= 70
                                ? 'text-green-600'
                                : q.difficultyIndex >= 50
                                ? 'text-yellow-600'
                                : 'text-red-600'
                            }`}
                          >
                            {q.difficultyIndex.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Performance */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Student Performance</h2>
              <button
                onClick={loadStudents}
                disabled={loadingStudents}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loadingStudents ? 'Đang tải...' : 'Xem chi tiết'}
              </button>
            </div>

            {showStudents && students.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attempts</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Best %</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.studentName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.studentEmail}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{student.totalAttempts}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {student.bestScore} / {analytics.scores.max}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {student.bestPercentage.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {student.bestPercentage >= (analytics.exam.passingScore / analytics.scores.max) * 100 ? (
                            <span className="inline-flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-red-600">
                              <XCircle className="w-4 h-4 mr-1" />
                              Failed
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {showStudents && students.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">Chưa có học viên nào làm bài.</p>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExamAnalyticsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <ExamAnalyticsContent />
    </ProtectedRoute>
  );
}
