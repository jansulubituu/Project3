'use client';

import { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { X } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';
type QuestionDifficulty = 'easy' | 'medium' | 'hard';

interface QuestionDetail {
  _id: string;
  course: { _id: string; title: string };
  section?: { _id: string; title: string } | null;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string;
  points: number;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  expectedAnswers?: string[];
  tags?: string[];
  topic?: string;
  cognitiveLevel?: string;
  version: number;
}

function QuestionEditContentInner() {
  const params = useParams<{ id: string; questionId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = params?.id;
  const questionId = params?.questionId;
  const examId = searchParams?.get('examId');

  const [question, setQuestion] = useState<QuestionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    type: 'single_choice' as QuestionType,
    difficulty: 'medium' as QuestionDifficulty,
    text: '',
    points: '1',
    options: [
      { id: '1', text: '', isCorrect: false },
      { id: '2', text: '', isCorrect: false },
    ],
    expectedAnswers: [''],
    tags: '',
    topic: '',
    cognitiveLevel: '',
  });

  useEffect(() => {
    if (!questionId) return;

    const loadQuestion = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get(`/questions/${questionId}`);
        if (res.data?.success) {
          const q = res.data.question;
          setQuestion(q);

          // Pre-fill form
          setForm({
            type: q.type,
            difficulty: q.difficulty,
            text: q.text || '',
            points: String(q.points || 1),
            options:
              q.options && q.options.length > 0
                ? q.options.map((opt: any, idx: number) => ({
                    id: opt.id || String(idx + 1),
                    text: opt.text || '',
                    isCorrect: opt.isCorrect || false,
                  }))
                : [
                    { id: '1', text: '', isCorrect: false },
                    { id: '2', text: '', isCorrect: false },
                  ],
            expectedAnswers: q.expectedAnswers && q.expectedAnswers.length > 0 ? q.expectedAnswers : [''],
            tags: q.tags && q.tags.length > 0 ? q.tags.join(', ') : '',
            topic: q.topic || '',
            cognitiveLevel: q.cognitiveLevel || '',
          });
        } else {
          setError('Không tìm thấy câu hỏi.');
        }
      } catch (err: any) {
        console.error('Failed to load question:', err);
        setError(err?.response?.data?.message || 'Không thể tải thông tin câu hỏi.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestion();
  }, [questionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionId) return;

    setSaveError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!form.text.trim()) {
      errors.text = 'Vui lòng nhập nội dung câu hỏi.';
    }

    if (form.type === 'single_choice' || form.type === 'multiple_choice') {
      if (form.options.length < 2) {
        errors.options = 'Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.';
      } else {
        const validOptions = form.options.filter((opt) => opt.text.trim());
        if (validOptions.length < 2) {
          errors.options = 'Vui lòng điền đầy đủ ít nhất 2 lựa chọn.';
        } else {
          const correctCount = validOptions.filter((opt) => opt.isCorrect).length;
          if (correctCount === 0) {
            errors.options = 'Vui lòng chọn ít nhất một đáp án đúng.';
          } else if (form.type === 'single_choice' && correctCount > 1) {
            errors.options = 'Câu hỏi trắc nghiệm một đáp án chỉ được có một đáp án đúng.';
          }
        }
      }
    }

    if (form.type === 'short_answer') {
      const validAnswers = form.expectedAnswers.filter((ans) => ans.trim());
      if (validAnswers.length === 0) {
        errors.expectedAnswers = 'Vui lòng nhập ít nhất một đáp án mong đợi.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      setTimeout(() => {
        const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                        document.querySelector(`#${firstErrorField}`) ||
                        document.querySelector('textarea[name="text"]');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          (element as HTMLElement).focus();
        }
      }, 100);
      return;
    }

    try {
      setSaving(true);

      const payload: any = {
        type: form.type,
        difficulty: form.difficulty,
        text: form.text.trim(),
        points: Number(form.points) || 1,
      };

      if (form.type === 'single_choice' || form.type === 'multiple_choice') {
        payload.options = form.options
          .filter((opt) => opt.text.trim())
          .map((opt) => ({
            id: opt.id,
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
          }));
      }

      if (form.type === 'short_answer') {
        payload.expectedAnswers = form.expectedAnswers
          .filter((ans) => ans.trim())
          .map((ans) => ans.trim());
      }

      if (form.tags.trim()) {
        payload.tags = form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      if (form.topic.trim()) {
        payload.topic = form.topic.trim();
      }

      if (form.cognitiveLevel.trim()) {
        payload.cognitiveLevel = form.cognitiveLevel.trim();
      }

      const res = await api.put(`/questions/${questionId}`, payload);
      if (res.data?.success) {
        // Get the new question ID (versioning creates new question)
        const newQuestionId = res.data.question._id;

        // Navigate back to exam questions page if we came from there
        if (examId && courseId) {
          // Update exam to use new question version
          try {
            const examRes = await api.get(`/exams/${examId}`);
            if (examRes.data?.success) {
              const exam = examRes.data.exam;
              const updatedQuestions = exam.questions.map((q: any) => {
                const questionIdStr = q.question?._id?.toString() || q.question?.toString();
                if (questionIdStr === questionId) {
                  return {
                    ...q,
                    question: newQuestionId,
                  };
                }
                return q;
              });

              await api.put(`/exams/${examId}`, {
                questions: updatedQuestions,
              });
            }
          } catch (err) {
            console.error('Failed to update exam with new question version:', err);
          }

          router.push(`/instructor/courses/${courseId}/exams/${examId}/questions`);
        } else if (courseId) {
          // Try to find exam that uses this question
          try {
            const examsRes = await api.get(`/exams/course/${courseId}`);
            if (examsRes.data?.success && Array.isArray(examsRes.data.exams)) {
              const examUsingQuestion = examsRes.data.exams.find((exam: any) =>
                exam.questions?.some((q: any) => {
                  const qId = q.question?._id?.toString() || q.question?.toString();
                  return qId === questionId;
                })
              );
              if (examUsingQuestion) {
                // Update exam to use new question version
                const updatedQuestions = examUsingQuestion.questions.map((q: any) => {
                  const qId = q.question?._id?.toString() || q.question?.toString();
                  if (qId === questionId) {
                    return {
                      ...q,
                      question: newQuestionId,
                    };
                  }
                  return q;
                });

                await api.put(`/exams/${examUsingQuestion._id}`, {
                  questions: updatedQuestions,
                });

                router.push(`/instructor/courses/${courseId}/exams/${examUsingQuestion._id}/questions`);
                return;
              }
            }
          } catch (err) {
            console.error('Failed to find exam using question:', err);
          }
          router.push(`/instructor/courses/${courseId}/curriculum`);
        } else {
          router.push('/instructor/courses');
        }
      } else {
        setSaveError(res.data?.message || 'Không thể cập nhật câu hỏi.');
      }
    } catch (err: any) {
      console.error('Failed to update question:', err);
      
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
        const message =
          err?.response?.data?.message ||
          (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.message) ||
          'Không thể cập nhật câu hỏi, vui lòng thử lại.';
        setSaveError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { id: String(Date.now()), text: '', isCorrect: false },
      ],
    }));
  };

  const removeOption = (id: string) => {
    if (form.options.length <= 2) {
      setSaveError('Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== id),
    }));
  };

  const updateOption = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const addExpectedAnswer = () => {
    setForm((prev) => ({
      ...prev,
      expectedAnswers: [...prev.expectedAnswers, ''],
    }));
  };

  const removeExpectedAnswer = (index: number) => {
    if (form.expectedAnswers.length <= 1) {
      setSaveError('Câu hỏi tự luận cần ít nhất một đáp án mong đợi.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      expectedAnswers: prev.expectedAnswers.filter((_, i) => i !== index),
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải thông tin câu hỏi...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !question) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải câu hỏi</h2>
            <p className="text-gray-600 mb-4">{error || 'Câu hỏi không tồn tại.'}</p>
            {courseId && (
              <button
                type="button"
                onClick={() => router.push(`/instructor/courses/${courseId}/exams`)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Quay lại
              </button>
            )}
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
              <h1 className="text-2xl font-bold text-gray-900">Chỉnh sửa câu hỏi</h1>
              <p className="text-sm text-gray-600 mt-1">
                Khóa học: {question.course.title} · Phiên bản: {question.version}
              </p>
            </div>
            {courseId && (
              <Link
                href={`/instructor/courses/${courseId}/curriculum`}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại
              </Link>
            )}
          </div>

          {/* Info banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Khi chỉnh sửa câu hỏi, hệ thống sẽ tạo một phiên bản mới và lưu trữ phiên bản cũ.
              Điều này giúp theo dõi lịch sử thay đổi và đảm bảo tính toàn vẹn dữ liệu.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">Thông tin câu hỏi</h2>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại câu hỏi <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.type}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      type: e.target.value as QuestionType,
                      options:
                        e.target.value === 'short_answer'
                          ? []
                          : prev.options.length === 0
                          ? [
                              { id: '1', text: '', isCorrect: false },
                              { id: '2', text: '', isCorrect: false },
                            ]
                          : prev.options,
                      expectedAnswers:
                        e.target.value === 'short_answer'
                          ? prev.expectedAnswers.length === 0
                            ? ['']
                            : prev.expectedAnswers
                          : [],
                    }));
                  }}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={saving}
                  required
                >
                  <option value="single_choice">Trắc nghiệm (1 đáp án)</option>
                  <option value="multiple_choice">Trắc nghiệm (nhiều đáp án)</option>
                  <option value="short_answer">Tự luận</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  <strong>Trắc nghiệm (1 đáp án):</strong> Học viên chỉ có thể chọn một đáp án đúng. <strong>Trắc nghiệm (nhiều đáp án):</strong> Học viên có thể chọn nhiều đáp án đúng. <strong>Tự luận:</strong> Học viên nhập câu trả lời bằng văn bản.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Độ khó <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.difficulty}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        difficulty: e.target.value as QuestionDifficulty,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                    required
                  >
                    <option value="easy">Dễ</option>
                    <option value="medium">Trung bình</option>
                    <option value="hard">Khó</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Điểm số <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={form.points}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, points: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={saving}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="text"
                  value={form.text}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, text: e.target.value }));
                    if (fieldErrors.text) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.text;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    fieldErrors.text ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  rows={4}
                  disabled={saving}
                  required
                  placeholder="Ví dụ: React là một thư viện JavaScript được phát triển bởi Facebook để xây dựng giao diện người dùng..."
                />
                {fieldErrors.text && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.text}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Viết câu hỏi rõ ràng, dễ hiểu. Có thể sử dụng định dạng Markdown để làm nổi bật các phần quan trọng.
                </p>
              </div>

              {/* Options for choice questions */}
              {(form.type === 'single_choice' || form.type === 'multiple_choice') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Các lựa chọn <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      disabled={saving}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Thêm lựa chọn
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <input
                          type={form.type === 'single_choice' ? 'radio' : 'checkbox'}
                          checked={option.isCorrect}
                          onChange={(e) => updateOption(option.id, 'isCorrect', e.target.checked)}
                          disabled={saving}
                          className="flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Lựa chọn ${index + 1}`}
                          disabled={saving}
                        />
                        {form.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(option.id)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Chọn đáp án đúng bằng cách tick vào ô bên trái
                  </p>
                </div>
              )}

              {/* Expected answers for short answer */}
              {form.type === 'short_answer' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Đáp án mong đợi <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addExpectedAnswer}
                      disabled={saving}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Thêm đáp án
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.expectedAnswers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => {
                            const newAnswers = [...form.expectedAnswers];
                            newAnswers[index] = e.target.value;
                            setForm((prev) => ({ ...prev, expectedAnswers: newAnswers }));
                          }}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Ví dụ: React, React.js, ReactJS`}
                          disabled={saving}
                        />
                        {form.expectedAnswers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExpectedAnswer(index)}
                            disabled={saving}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Xóa đáp án này"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-500">
                      Nhập các đáp án có thể chấp nhận được. Hệ thống sẽ tự động so sánh với câu trả lời của học viên (không phân biệt hoa thường).
                    </p>
                    <p className="text-xs text-gray-400">
                      💡 Tip: Thêm nhiều biến thể của đáp án (ví dụ: "React", "React.js", "ReactJS") để chấp nhận nhiều cách viết khác nhau.
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Có thể thêm nhiều đáp án đúng (phân cách bằng dấu phẩy hoặc từng dòng)
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, tags: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ví dụ: toán, đại số, hình học (phân cách bằng dấu phẩy)"
                    disabled={saving}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề</label>
                  <input
                    type="text"
                    value={form.topic}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, topic: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Chủ đề của câu hỏi"
                    disabled={saving}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mức độ nhận thức
                </label>
                <input
                  type="text"
                  value={form.cognitiveLevel}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cognitiveLevel: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: nhớ, hiểu, vận dụng, phân tích, đánh giá, sáng tạo"
                  disabled={saving}
                />
              </div>

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

              <div className="flex justify-end gap-2 pt-4 border-t">
                {courseId && (
                  <Link
                    href={`/instructor/courses/${courseId}/curriculum`}
                    className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Hủy
                  </Link>
                )}
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi (Tạo phiên bản mới)'}
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

function QuestionEditContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <QuestionEditContentInner />
    </Suspense>
  );
}

export default function QuestionEditPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <QuestionEditContent />
    </ProtectedRoute>
  );
}

