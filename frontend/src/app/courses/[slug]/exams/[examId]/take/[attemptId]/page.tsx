'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Clock, Save, CheckCircle, AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';

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
  expectedAnswers?: string[];
  userAnswer?: {
    answerSingle?: string;
    answerMultiple?: string[];
    answerText?: string;
  };
}

interface Answer {
  question: string;
  answerSingle?: string;
  answerMultiple?: string[];
  answerText?: string;
}

interface Attempt {
  id: string;
  exam: string;
  startedAt: string;
  expiresAt?: string | null;
  status: string;
}

function ExamTakeContent() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const examId = params.examId as string;
  const attemptId = params.attemptId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadAttempt = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/exams/${examId}/attempts/${attemptId}`);
        if (res.data?.success) {
          const attemptData = res.data.attempt;
          setAttempt(attemptData);
          setQuestions(res.data.questions || []);

          // Load existing answers
          const existingAnswers: Record<string, Answer> = {};
          res.data.questions?.forEach((q: Question) => {
            if (q.userAnswer) {
              existingAnswers[q.id] = {
                question: q.id,
                answerSingle: q.userAnswer.answerSingle,
                answerMultiple: q.userAnswer.answerMultiple,
                answerText: q.userAnswer.answerText,
              };
            } else {
              existingAnswers[q.id] = { question: q.id };
            }
          });
          setAnswers(existingAnswers);

          // Calculate time remaining
          if (attemptData.expiresAt) {
            const expiresAt = new Date(attemptData.expiresAt).getTime();
            const now = Date.now();
            const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
            setTimeRemaining(remaining);
          }
        } else {
          setError(res.data?.message || 'Không thể tải bài kiểm tra.');
        }
      } catch (err: any) {
        console.error('Failed to load attempt:', err);
        setError(err?.response?.data?.message || 'Không thể tải bài kiểm tra.');
      } finally {
        setLoading(false);
      }
    };

    if (attemptId) {
      loadAttempt();
    }

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [examId, attemptId]);

  // Timer countdown
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          // Time expired, auto submit
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [timeRemaining]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (questions.length === 0) return;

    autoSaveIntervalRef.current = setInterval(() => {
      saveAnswers(false);
    }, 30000); // 30 seconds

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [answers, questions]);

  const saveAnswers = async (showMessage = true) => {
    if (saving) return;

    try {
      setSaving(true);
      // Note: Backend doesn't have a save endpoint, so we'll just update locally
      // In a real implementation, you might want to add an auto-save endpoint
      if (showMessage) {
        // Could show a toast notification here
      }
    } catch (err) {
      console.error('Failed to save answers:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAutoSubmit = async () => {
    if (submitting) return;
    await handleSubmit(true);
  };

  const handleSubmit = async (isAuto = false) => {
    if (submitting) return;

    if (!isAuto && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      return;
    }

    try {
      setSubmitting(true);

      const answersArray = Object.values(answers).filter(
        (ans) =>
          ans.answerSingle ||
          (ans.answerMultiple && ans.answerMultiple.length > 0) ||
          ans.answerText
      );

      const res = await api.post(`/exams/${examId}/attempts/${attemptId}/submit`, {
        answers: answersArray,
      });

      if (res.data?.success) {
        router.push(`/courses/${slug}/exams/${examId}/attempts/${attemptId}`);
      } else {
        alert(res.data?.message || 'Không thể nộp bài.');
        setSubmitting(false);
        setShowConfirmSubmit(false);
      }
    } catch (err: any) {
      console.error('Failed to submit exam:', err);
      alert(err?.response?.data?.message || 'Không thể nộp bài, vui lòng thử lại.');
      setSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const updateAnswer = (questionId: string, answer: Partial<Answer>) => {
    // Use functional update to prevent race conditions
    setAnswers((prev) => {
      const currentAnswer = prev[questionId] || { question: questionId };
      return {
        ...prev,
        [questionId]: {
          ...currentAnswer,
          ...answer,
          question: questionId,
        },
      };
    });
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.values(answers).filter(
    (ans) =>
      ans.answerSingle ||
      (ans.answerMultiple && ans.answerMultiple.length > 0) ||
      ans.answerText
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải bài kiểm tra...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !attempt || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải bài kiểm tra</h2>
            <p className="text-gray-600 mb-4">{error || 'Bài kiểm tra không tồn tại.'}</p>
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      {/* Timer Bar */}
      <div className="bg-blue-600 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            <span className="font-semibold">
              {timeRemaining !== null ? formatTime(timeRemaining) : 'Không giới hạn'}
            </span>
            {timeRemaining !== null && timeRemaining < 300 && (
              <AlertTriangle className="w-5 h-5 text-yellow-300 animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              Đã trả lời: {answeredCount}/{questions.length}
            </span>
            {saving && (
              <span className="text-sm flex items-center gap-1">
                <Save className="w-4 h-4" />
                Đang lưu...
              </span>
            )}
          </div>
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Questions Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow border border-gray-100 sticky top-4">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">Danh sách câu hỏi</h3>
                </div>
                <div className="p-3">
                  <div className="grid grid-cols-5 lg:grid-cols-1 gap-2 max-h-[600px] overflow-y-auto">
                    {questions.map((q, index) => {
                      const isAnswered = answers[q.id]?.answerSingle ||
                        (answers[q.id]?.answerMultiple && answers[q.id].answerMultiple!.length > 0) ||
                        answers[q.id]?.answerText;
                      const isCurrent = index === currentQuestionIndex;

                      return (
                        <button
                          key={q.id}
                          type="button"
                          onClick={() => setCurrentQuestionIndex(index)}
                          className={`p-2 rounded text-sm font-medium transition-colors ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isAnswered
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {index + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Question Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg shadow border border-gray-100">
                <div className="px-6 py-4 border-b flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-500">Câu hỏi</span>
                    <span className="text-sm font-semibold text-gray-900 ml-2">
                      {currentQuestionIndex + 1} / {questions.length}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                    {currentQuestion.points} điểm
                  </span>
                </div>

                <div className="px-6 py-6">
                  <div className="mb-6">
                    <p className="text-lg text-gray-900 whitespace-pre-wrap">
                      {currentQuestion.text}
                    </p>
                    {currentQuestion.images && currentQuestion.images.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {currentQuestion.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Question image ${idx + 1}`}
                            className="max-w-full rounded-lg border border-gray-200"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Single Choice */}
                  {currentQuestion.type === 'single_choice' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="radio"
                            name={`question-${currentQuestion.id}`}
                            value={option.id}
                            checked={answers[currentQuestion.id]?.answerSingle === option.id}
                            onChange={(e) => {
                              e.preventDefault();
                              updateAnswer(currentQuestion.id, { answerSingle: e.target.value });
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-gray-900">{option.text}</p>
                            {option.image && (
                              <img
                                src={option.image}
                                alt="Option image"
                                className="mt-2 max-w-full rounded border border-gray-200"
                              />
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Multiple Choice */}
                  {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option) => (
                        <label
                          key={option.id}
                          className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={
                              answers[currentQuestion.id]?.answerMultiple?.includes(option.id) ||
                              false
                            }
                            onChange={(e) => {
                              const current = answers[currentQuestion.id]?.answerMultiple || [];
                              const updated = e.target.checked
                                ? [...current, option.id]
                                : current.filter((id) => id !== option.id);
                              updateAnswer(currentQuestion.id, { answerMultiple: updated });
                            }}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <p className="text-gray-900">{option.text}</p>
                            {option.image && (
                              <img
                                src={option.image}
                                alt="Option image"
                                className="mt-2 max-w-full rounded border border-gray-200"
                              />
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}

                  {/* Short Answer */}
                  {currentQuestion.type === 'short_answer' && (
                    <div>
                      <textarea
                        value={answers[currentQuestion.id]?.answerText || ''}
                        onChange={(e) => {
                          updateAnswer(currentQuestion.id, { answerText: e.target.value });
                        }}
                        className="w-full rounded-md border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={6}
                        placeholder="Nhập câu trả lời của bạn..."
                      />
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="px-6 py-4 border-t flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex > 0) {
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                      }
                    }}
                    disabled={currentQuestionIndex === 0}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowLeft className="w-4 h-4 mr-1" />
                    Câu trước
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (currentQuestionIndex < questions.length - 1) {
                        setCurrentQuestionIndex(currentQuestionIndex + 1);
                      }
                    }}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Câu sau
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg text-base font-medium hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <CheckCircle className="w-5 h-5 mr-2" />
                  {submitting ? 'Đang nộp bài...' : 'Nộp bài'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="px-5 py-3 border-b">
              <h2 className="text-lg font-semibold text-gray-900">Xác nhận nộp bài</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Bạn có chắc chắn muốn nộp bài? Sau khi nộp, bạn sẽ không thể chỉnh sửa câu trả lời.
              </p>
              <div className="text-sm text-gray-700 mb-4">
                <p>Đã trả lời: {answeredCount}/{questions.length} câu hỏi</p>
                {answeredCount < questions.length && (
                  <p className="text-yellow-600 mt-1">
                    Bạn còn {questions.length - answeredCount} câu hỏi chưa trả lời.
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmSubmit(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => handleSubmit(true)}
                  disabled={submitting}
                  className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-60"
                >
                  {submitting ? 'Đang nộp...' : 'Xác nhận nộp bài'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function ExamTakePage() {
  return (
    <ProtectedRoute allowedRoles={['student', 'instructor', 'admin']}>
      <ExamTakeContent />
    </ProtectedRoute>
  );
}

