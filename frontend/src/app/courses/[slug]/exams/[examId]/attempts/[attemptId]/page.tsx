'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Award, Clock, FileText, ArrowLeft, XCircle } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';

interface Question {
  id: string;
  type: QuestionType;
  difficulty: string;
  text: string;
  images?: string[];
  points: number;
  options?: Array<{ id: string; text: string; image?: string }>;
  userAnswer?: {
    answerSingle?: string;
    answerMultiple?: string[];
    answerText?: string;
    answerSingleText?: string; // Text of selected option for single choice
    answerMultipleTexts?: string[]; // Texts of selected options for multiple choice
    score?: number;
    maxScore?: number;
  };
}

interface Attempt {
  id: string;
  exam: string;
  startedAt: string;
  submittedAt?: string | null;
  expiresAt?: string | null;
  status: string;
  score?: number;
  maxScore?: number;
  passed?: boolean;
}

interface ExamInfo {
  maxAttempts?: number | null;
  remainingAttempts?: number | null;
}

function ExamResultContent() {
  const params = useParams();
  const slug = params.slug as string;
  const examId = params.examId as string;
  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examInfo, setExamInfo] = useState<ExamInfo | null>(null);

  useEffect(() => {
    const loadResult = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/exams/${examId}/attempts/${attemptId}`);
        if (res.data?.success) {
          setAttempt(res.data.attempt);
          setQuestions(res.data.questions || []);
        } else {
          setError(res.data?.message || 'Không thể tải kết quả bài kiểm tra.');
        }

        // Get exam overview to check remaining attempts
        try {
          const overviewRes = await api.get(`/exams/${examId}/overview`);
          if (overviewRes.data?.success) {
            setExamInfo({
              maxAttempts: overviewRes.data.exam.maxAttempts,
              remainingAttempts: overviewRes.data.attempts.remaining,
            });
          }
        } catch (overviewErr) {
          console.error('Failed to load exam overview:', overviewErr);
          // Don't fail the whole page if overview fails
        }
      } catch (err: any) {
        console.error('Failed to load result:', err);
        setError(err?.response?.data?.message || 'Không thể tải kết quả bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) {
      loadResult();
    }
  }, [examId, attemptId]);

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


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải kết quả...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !attempt) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải kết quả</h2>
            <p className="text-gray-600 mb-4">{error || 'Kết quả không tồn tại.'}</p>
            <Link
              href={`/courses/${slug}/exams/${examId}`}
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

  // Calculate total score from questions (sum of all userAnswer.score)
  // This is the actual score achieved, including negative marking
  const totalScoreAchieved = questions.reduce((sum, q) => {
    if (!q.userAnswer) return sum;
    const score = q.userAnswer.score;
    return sum + (score !== undefined && score !== null ? score : 0);
  }, 0);
  
  // Calculate total max score from questions (sum of all userAnswer.maxScore)
  // This is the total possible score for all questions
  const totalMaxScore = questions.reduce((sum, q) => {
    if (!q.userAnswer) {
      // If no answer, still count the maxScore for this question
      // Use question.points as fallback (but backend should always provide maxScore in userAnswer)
      return sum + (q.points || 0);
    }
    const maxScore = q.userAnswer.maxScore;
    return sum + (maxScore !== undefined && maxScore !== null ? maxScore : (q.points || 0));
  }, 0);
  
  // Don't count correct/incorrect - only show score
  
  // Use calculated values (from actual question answers) instead of attempt.score
  // because attempt.score may have been clamped to 0 or adjusted with late penalty
  // But if attempt.score and attempt.maxScore are available, prefer them as they're the official values
  const displayScore = attempt?.score !== undefined && attempt?.score !== null 
    ? attempt.score 
    : totalScoreAchieved;
  const displayMaxScore = attempt?.maxScore !== undefined && attempt?.maxScore !== null
    ? attempt.maxScore
    : totalMaxScore;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/courses/${slug}/exams/${examId}`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại bài kiểm tra
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Kết quả bài kiểm tra</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Bắt đầu: {formatDate(attempt.startedAt)}</span>
              </div>
              {attempt.submittedAt && (
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>Nộp bài: {formatDate(attempt.submittedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Score Summary */}
          {displayScore !== undefined && displayMaxScore !== undefined && displayMaxScore > 0 && (
            <div className="bg-white rounded-lg shadow border border-gray-100 mb-6">
              <div className="px-6 py-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-4">
                    <Award className="w-12 h-12 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {displayScore} / {displayMaxScore} điểm
                  </h2>
                  <p className="text-lg text-gray-600 mb-4">
                    {((displayScore / displayMaxScore) * 100).toFixed(1)}%
                  </p>
                  {attempt.passed !== undefined && (
                    <div
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                        attempt.passed
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {attempt.passed ? (
                        <span className="font-semibold">Đạt</span>
                      ) : (
                        <span className="font-semibold">Không đạt</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Statistics - Only show total questions
          <div className="grid grid-cols-1 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow border border-gray-100 p-4">
              <p className="text-sm text-gray-600 mb-1">Tổng số câu hỏi</p>
              <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
            </div>
          </div> */}


          {/* Retake Button (only if has remaining attempts) */}
          {examInfo && examInfo.remainingAttempts !== null && examInfo.remainingAttempts !== undefined && examInfo.remainingAttempts > 0 && (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/courses/${slug}/exams/${examId}`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg text-base font-medium hover:bg-blue-700"
              >
                Làm lại bài kiểm tra ({examInfo.remainingAttempts} lần còn lại)
              </Link>
            </div>
          )}

          {/* No more attempts message */}
          {examInfo && examInfo.remainingAttempts !== null && examInfo.remainingAttempts !== undefined && examInfo.remainingAttempts === 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-red-800 font-medium">
                  Bạn đã hoàn thành tất cả {examInfo.maxAttempts} lần làm bài kiểm tra này.
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Không thể làm lại bài kiểm tra này nữa.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExamResultPage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
      <ExamResultContent />
    </ProtectedRoute>
  );
}

