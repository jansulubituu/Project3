'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Eye,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface Question {
  _id: string;
  type: 'single_choice' | 'multiple_choice' | 'short_answer';
  text: string;
  images?: string[];
  options?: Array<{
    id: string;
    text: string;
    isCorrect?: boolean;
  }>;
  expectedAnswers?: string[];
  points: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface Exam {
  _id: string;
  title: string;
  description?: string;
  totalPoints: number;
  passingScore: number;
  durationMinutes: number;
  questions: Array<{
    question: Question;
    order: number;
    weight?: number;
  }>;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  status: 'draft' | 'published' | 'archived';
}

function ExamPreviewContent() {
  const params = useParams<{ id: string; examId: string }>();
  const courseId = params?.id;
  const examId = params?.examId;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!examId) return;
    loadExam();
  }, [examId]);

  const loadExam = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await api.get(`/exams/${examId}`);
      if (res.data?.success) {
        const examData = res.data.exam;
        
        // Sort questions by order if not shuffled
        const sortedQuestions = examData.shuffleQuestions
          ? [...examData.questions]
          : [...examData.questions].sort((a: any, b: any) => (a.order || 0) - (b.order || 0));

        // Shuffle answers if needed
        const processedQuestions = sortedQuestions.map((qRef: any) => {
          const question = qRef.question;
          let processedOptions = question.options || [];

          if (examData.shuffleAnswers && question.options) {
            processedOptions = [...question.options].sort(() => Math.random() - 0.5);
          }

          return {
            ...qRef,
            question: {
              ...question,
              options: processedOptions,
            },
          };
        });

        setExam({
          ...examData,
          questions: processedQuestions,
        });
      } else {
        setError(res.data?.message || 'Không thể tải exam.');
      }
    } catch (err: any) {
      console.error('Failed to load exam:', err);
      setError(err?.response?.data?.message || 'Không thể tải exam.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: string, isMultiple: boolean) => {
    setAnswers((prev) => {
      if (isMultiple) {
        const current = prev[questionId] || [];
        const newValue = current.includes(value)
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [questionId]: newValue };
      } else {
        return { ...prev, [questionId]: [value] };
      }
    });
  };

  const currentQuestion = exam?.questions[currentQuestionIndex]?.question;
  const totalQuestions = exam?.questions.length || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải exam...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải exam</h2>
            <p className="text-gray-600 mb-4">{error || 'Exam không tồn tại'}</p>
            <Link
              href={`/instructor/courses/${courseId}/exams`}
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

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/instructor/courses/${courseId}/exams/${examId}/edit`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại chỉnh sửa exam
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Eye className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Preview Exam</h1>
                  <p className="text-sm text-gray-600 mt-1">{exam.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Preview Mode</span>
              </div>
            </div>
          </div>

          {/* Exam Info */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Total Questions</p>
                  <p className="text-lg font-semibold text-gray-900">{totalQuestions}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="text-lg font-semibold text-gray-900">{exam.durationMinutes} minutes</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Passing Score</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {exam.passingScore} / {exam.totalPoints}
                  </p>
                </div>
              </div>
            </div>
            {exam.description && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">{exam.description}</p>
              </div>
            )}
          </div>

          {/* Question Navigation */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">
                Question {currentQuestionIndex + 1} of {totalQuestions}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                  disabled={currentQuestionIndex === 0}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentQuestionIndex(Math.min(totalQuestions - 1, currentQuestionIndex + 1))}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {exam.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-10 h-10 rounded-md text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white'
                      : answers[exam.questions[index].question._id]
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Current Question */}
          {currentQuestion && (
            <div className="bg-white rounded-lg shadow border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {currentQuestion.type === 'single_choice'
                      ? 'Single Choice'
                      : currentQuestion.type === 'multiple_choice'
                      ? 'Multiple Choice'
                      : 'Short Answer'}
                  </span>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium capitalize">
                    {currentQuestion.difficulty}
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                    {currentQuestion.points} points
                  </span>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-4">{currentQuestion.text}</h3>

              {currentQuestion.images && currentQuestion.images.length > 0 && (
                <div className="mb-4 space-y-2">
                  {currentQuestion.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Question image ${idx + 1}`}
                      className="max-w-full h-auto rounded-lg border border-gray-200"
                    />
                  ))}
                </div>
              )}

              {/* Show correct answers in preview mode */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-2">Correct Answer (Preview Mode):</p>
                {currentQuestion.type === 'short_answer' ? (
                  <div className="space-y-1">
                    {currentQuestion.expectedAnswers?.map((ans, idx) => (
                      <p key={idx} className="text-sm text-blue-800">
                        • {ans}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {currentQuestion.options
                      ?.filter((opt) => opt.isCorrect)
                      .map((opt) => (
                        <p key={opt.id} className="text-sm text-blue-800">
                          • {opt.text}
                        </p>
                      ))}
                  </div>
                )}
              </div>

              {/* Answer Options */}
              {(currentQuestion.type === 'single_choice' || currentQuestion.type === 'multiple_choice') &&
                currentQuestion.options && (
                  <div className="space-y-2">
                    {currentQuestion.options.map((option) => {
                      const isSelected = answers[currentQuestion._id]?.includes(option.id);
                      const isCorrect = option.isCorrect;

                      return (
                        <label
                          key={option.id}
                          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? isCorrect
                                ? 'border-green-500 bg-green-50'
                                : 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type={currentQuestion.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                            name={`question-${currentQuestion._id}`}
                            checked={isSelected}
                            onChange={() => handleAnswerChange(currentQuestion._id, option.id, currentQuestion.type === 'multiple_choice')}
                            className="mt-1"
                          />
                          <div className="ml-3 flex-1">
                            <span className="text-gray-900">{option.text}</span>
                            {isCorrect && (
                              <span className="ml-2 inline-flex items-center text-xs text-green-600">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Correct
                              </span>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}

              {currentQuestion.type === 'short_answer' && (
                <div>
                  <textarea
                    value={answers[currentQuestion._id]?.[0] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion._id, e.target.value, false)}
                    placeholder="Type your answer here..."
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                  />
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          <div className="mt-6 bg-white rounded-lg shadow border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600 mb-2">Answered Questions:</p>
                <p className="text-lg font-semibold text-gray-900">
                  {Object.keys(answers).length} / {totalQuestions}
                </p>
              </div>
              <div>
                <p className="text-gray-600 mb-2">Status:</p>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                    exam.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : exam.status === 'draft'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {exam.status === 'published' ? 'Published' : exam.status === 'draft' ? 'Draft' : 'Archived'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-gray-500">
                <strong>Note:</strong> This is a preview mode. Answers are not saved. Use this to review the exam
                before publishing.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function ExamPreviewPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <ExamPreviewContent />
    </ProtectedRoute>
  );
}
