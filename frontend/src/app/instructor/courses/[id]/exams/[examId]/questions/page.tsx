'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Edit2, X } from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

type QuestionType = 'single_choice' | 'multiple_choice' | 'short_answer';
type QuestionDifficulty = 'easy' | 'medium' | 'hard';

interface Question {
  _id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string;
  points: number;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  expectedAnswers?: string[];
  tags?: string[];
}

interface ExamQuestion {
  question: Question;
  weight: number;
  order: number;
  questionPoints?: number; // Override points from Question
}

interface ExamDetail {
  _id: string;
  title: string;
  questions: ExamQuestion[];
}

interface QuestionBankItem {
  _id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string;
  points: number;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  expectedAnswers?: string[];
  tags?: string[];
}

interface SortableQuestionItemProps {
  question: ExamQuestion;
  index: number;
  onRemove: (questionId: string) => void;
  onEdit: (question: Question) => void;
  onUpdatePoints: (questionId: string, points: number | null) => void;
}

function SortableQuestionItem({
  question,
  index,
  onRemove,
  onEdit,
  onUpdatePoints,
}: SortableQuestionItemProps) {
  const [editingPoints, setEditingPoints] = useState(false);
  const [pointsValue, setPointsValue] = useState(
    question.questionPoints !== undefined 
      ? String(question.questionPoints) 
      : String(question.question.points)
  );
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.question._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getTypeLabel = (type: QuestionType) => {
    switch (type) {
      case 'single_choice':
        return 'Trắc nghiệm (1 đáp án)';
      case 'multiple_choice':
        return 'Trắc nghiệm (nhiều đáp án)';
      case 'short_answer':
        return 'Tự luận';
      default:
        return type;
    }
  };

  const getDifficultyColor = (difficulty: QuestionDifficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'hard':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 flex items-start gap-3 hover:shadow-md transition-shadow"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1"
      >
        <GripVertical className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">Câu {index + 1}</span>
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyColor(
                  question.question.difficulty
                )}`}
              >
                {question.question.difficulty === 'easy'
                  ? 'Dễ'
                  : question.question.difficulty === 'medium'
                  ? 'Trung bình'
                  : 'Khó'}
              </span>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">
                {getTypeLabel(question.question.type)}
              </span>
              {editingPoints ? (
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    step={0.5}
                    value={pointsValue}
                    onChange={(e) => setPointsValue(e.target.value)}
                    onBlur={() => {
                      const numValue = Number(pointsValue);
                      if (!Number.isNaN(numValue) && numValue >= 0) {
                        onUpdatePoints(
                          question.question._id,
                          numValue !== question.question.points ? numValue : null
                        );
                      } else {
                        setPointsValue(
                          question.questionPoints !== undefined
                            ? String(question.questionPoints)
                            : String(question.question.points)
                        );
                      }
                      setEditingPoints(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.currentTarget.blur();
                      } else if (e.key === 'Escape') {
                        setPointsValue(
                          question.questionPoints !== undefined
                            ? String(question.questionPoints)
                            : String(question.question.points)
                        );
                        setEditingPoints(false);
                      }
                    }}
                    className="w-16 px-2 py-0.5 rounded border border-gray-300 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                    autoFocus
                  />
                  <span className="text-xs text-gray-500">điểm</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingPoints(true)}
                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    question.questionPoints !== undefined
                      ? 'bg-purple-200 text-purple-800 hover:bg-purple-300'
                      : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                  }`}
                  title={
                    question.questionPoints !== undefined
                      ? 'Click để chỉnh sửa điểm (đang override)'
                      : 'Click để chỉnh sửa điểm (override điểm từ question)'
                  }
                >
                  {question.questionPoints !== undefined
                    ? `${question.questionPoints} điểm (override)`
                    : `${question.question.points} điểm`}
                </button>
              )}
              {question.weight !== 1 && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  Weight: {question.weight}x
                </span>
              )}
            </div>
            <p className="text-sm text-gray-800 line-clamp-2">{question.question.text}</p>
          </div>
        </div>

        {question.question.options && question.question.options.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <span className="font-medium">Đáp án:</span>{' '}
            {question.question.options
              .filter((opt) => opt.isCorrect)
              .map((opt) => opt.text)
              .join(', ')}
          </div>
        )}

        {question.question.expectedAnswers && question.question.expectedAnswers.length > 0 && (
          <div className="mt-2 text-xs text-gray-600">
            <span className="font-medium">Đáp án mong đợi:</span>{' '}
            {question.question.expectedAnswers.join(', ')}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={() => onEdit(question.question)}
          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Chỉnh sửa câu hỏi"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => onRemove(question.question._id)}
          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
          title="Xóa khỏi bài kiểm tra"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ExamQuestionsContent() {
  const params = useParams<{ id: string; examId: string }>();
  const router = useRouter();
  const courseId = params?.id;
  const examId = params?.examId;

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [questionBank, setQuestionBank] = useState<QuestionBankItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterType, setFilterType] = useState<QuestionType | ''>('');
  const [filterDifficulty, setFilterDifficulty] = useState<QuestionDifficulty | ''>('');
  const [creatingQuestion, setCreatingQuestion] = useState(false);
  const [createQuestionError, setCreateQuestionError] = useState<string | null>(null);
  const [questionForm, setQuestionForm] = useState({
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
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!courseId || !examId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [examRes, questionsRes] = await Promise.all([
          api.get(`/exams/${examId}`),
          api.get(`/questions/course/${courseId}`),
        ]);

        if (examRes.data?.success) {
          const e = examRes.data.exam;
          setExam({
            _id: e._id,
            title: e.title,
            questions: e.questions || [],
          });
        } else {
          setError('Không tìm thấy bài kiểm tra.');
        }

        if (questionsRes.data?.success && Array.isArray(questionsRes.data.questions)) {
          setQuestionBank(questionsRes.data.questions);
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err?.response?.data?.message || 'Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId, examId]);

  const handleDragStart = (_event: DragStartEvent) => {
    // Drag started
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !exam) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const oldIndex = exam.questions.findIndex((q) => q.question._id === activeId);
    const newIndex = exam.questions.findIndex((q) => q.question._id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    const newQuestions = arrayMove(exam.questions, oldIndex, newIndex);
    // Update order
    const updatedQuestions = newQuestions.map((q, idx) => ({
      ...q,
      order: idx + 1,
    }));

    setExam({ ...exam, questions: updatedQuestions });

    try {
      await api.put(`/exams/${examId}`, {
        questions: updatedQuestions.map((q) => ({
          question: q.question._id,
          weight: q.weight,
          order: q.order,
          questionPoints: q.questionPoints,
        })),
      });
    } catch (err: any) {
      console.error('Failed to reorder questions:', err);
      // Reload on error
      const examRes = await api.get(`/exams/${examId}`);
      if (examRes.data?.success) {
        const e = examRes.data.exam;
        setExam({
          _id: e._id,
          title: e.title,
          questions: e.questions || [],
        });
      }
      alert('Không thể sắp xếp lại câu hỏi, vui lòng thử lại.');
    }
  };

  const handleAddQuestion = async (questionId: string, weight: number = 1, questionPoints?: number) => {
    if (!exam) return;

    // Check if question already exists
    if (exam.questions.some((q) => q.question._id === questionId)) {
      alert('Câu hỏi này đã có trong bài kiểm tra.');
      return;
    }

    const question = questionBank.find((q) => q._id === questionId);
    if (!question) return;

    const newQuestion: ExamQuestion = {
      question,
      weight,
      order: exam.questions.length + 1,
      questionPoints: questionPoints !== undefined && questionPoints !== question.points ? questionPoints : undefined,
    };

    const newQuestions = [...exam.questions, newQuestion];

    try {
      setSaving(true);
      const res = await api.put(`/exams/${examId}`, {
        questions: newQuestions.map((q) => ({
          question: q.question._id,
          weight: q.weight,
          order: q.order,
          questionPoints: q.questionPoints,
        })),
      });

      if (res.data?.success) {
        setExam({ ...exam, questions: newQuestions });
        setShowAddModal(false);
      } else {
        alert(res.data?.message || 'Không thể thêm câu hỏi.');
      }
    } catch (err: any) {
      console.error('Failed to add question:', err);
      alert(err?.response?.data?.message || 'Không thể thêm câu hỏi, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestionPoints = async (questionId: string, points: number | null) => {
    if (!exam) return;

    const newQuestions = exam.questions.map((q) => {
      if (q.question._id === questionId) {
        return {
          ...q,
          questionPoints: points !== null ? points : undefined,
        };
      }
      return q;
    });

    try {
      setSaving(true);
      const res = await api.put(`/exams/${examId}`, {
        questions: newQuestions.map((q) => ({
          question: q.question._id,
          weight: q.weight,
          order: q.order,
          questionPoints: q.questionPoints,
        })),
      });

      if (res.data?.success) {
        setExam({ ...exam, questions: newQuestions });
      } else {
        alert(res.data?.message || 'Không thể cập nhật điểm.');
      }
    } catch (err: any) {
      console.error('Failed to update question points:', err);
      alert(err?.response?.data?.message || 'Không thể cập nhật điểm, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!exam) return;

    if (!confirm('Bạn có chắc muốn xóa câu hỏi này khỏi bài kiểm tra?')) return;

    const newQuestions = exam.questions.filter((q) => q.question._id !== questionId);
    // Reorder
    const updatedQuestions = newQuestions.map((q, idx) => ({
      ...q,
      order: idx + 1,
    }));

    try {
      setSaving(true);
        const res = await api.put(`/exams/${examId}`, {
          questions: updatedQuestions.map((q) => ({
            question: q.question._id,
            weight: q.weight,
            order: q.order,
            questionPoints: q.questionPoints,
          })),
        });

      if (res.data?.success) {
        setExam({ ...exam, questions: updatedQuestions });
      } else {
        alert(res.data?.message || 'Không thể xóa câu hỏi.');
      }
    } catch (err: any) {
      console.error('Failed to remove question:', err);
      alert(err?.response?.data?.message || 'Không thể xóa câu hỏi, vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = (question: Question) => {
    // Navigate to question edit page with examId in query params for navigation back
    router.push(`/instructor/courses/${courseId}/questions/${question._id}/edit?examId=${examId}`);
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      setCreatingQuestion(true);
      setCreateQuestionError(null);

      // Validate
      if (!questionForm.text.trim()) {
        setCreateQuestionError('Vui lòng nhập nội dung câu hỏi.');
        setCreatingQuestion(false);
        return;
      }

      if (questionForm.type === 'single_choice' || questionForm.type === 'multiple_choice') {
        if (questionForm.options.length < 2) {
          setCreateQuestionError('Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.');
          setCreatingQuestion(false);
          return;
        }

        const validOptions = questionForm.options.filter((opt) => opt.text.trim());
        if (validOptions.length < 2) {
          setCreateQuestionError('Vui lòng điền đầy đủ ít nhất 2 lựa chọn.');
          setCreatingQuestion(false);
          return;
        }

        const correctCount = validOptions.filter((opt) => opt.isCorrect).length;
        if (correctCount === 0) {
          setCreateQuestionError('Vui lòng chọn ít nhất một đáp án đúng.');
          setCreatingQuestion(false);
          return;
        }

        if (questionForm.type === 'single_choice' && correctCount > 1) {
          setCreateQuestionError('Câu hỏi trắc nghiệm một đáp án chỉ được có một đáp án đúng.');
          setCreatingQuestion(false);
          return;
        }
      }

      if (questionForm.type === 'short_answer') {
        const validAnswers = questionForm.expectedAnswers.filter((ans) => ans.trim());
        if (validAnswers.length === 0) {
          setCreateQuestionError('Vui lòng nhập ít nhất một đáp án mong đợi.');
          setCreatingQuestion(false);
          return;
        }
      }

      const payload: any = {
        course: courseId,
        type: questionForm.type,
        difficulty: questionForm.difficulty,
        text: questionForm.text.trim(),
        points: Number(questionForm.points) || 1,
      };

      if (questionForm.type === 'single_choice' || questionForm.type === 'multiple_choice') {
        payload.options = questionForm.options
          .filter((opt) => opt.text.trim())
          .map((opt) => ({
            id: opt.id,
            text: opt.text.trim(),
            isCorrect: opt.isCorrect,
          }));
      }

      if (questionForm.type === 'short_answer') {
        payload.expectedAnswers = questionForm.expectedAnswers
          .filter((ans) => ans.trim())
          .map((ans) => ans.trim());
      }

      if (questionForm.tags.trim()) {
        payload.tags = questionForm.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter((tag) => tag);
      }

      const res = await api.post('/questions', payload);
      if (res.data?.success) {
        // Reload question bank
        const questionsRes = await api.get(`/questions/course/${courseId}`);
        if (questionsRes.data?.success && Array.isArray(questionsRes.data.questions)) {
          setQuestionBank(questionsRes.data.questions);
        }

        // Add to exam automatically
        const newQuestion = res.data.question;
        await handleAddQuestion(newQuestion._id);

        // Reset form
        setQuestionForm({
          type: 'single_choice',
          difficulty: 'medium',
          text: '',
          points: '1',
          options: [
            { id: '1', text: '', isCorrect: false },
            { id: '2', text: '', isCorrect: false },
          ],
          expectedAnswers: [''],
          tags: '',
        });
        setShowCreateModal(false);
      } else {
        setCreateQuestionError(res.data?.message || 'Không thể tạo câu hỏi.');
      }
    } catch (err: any) {
      console.error('Failed to create question:', err);
      setCreateQuestionError(
        err?.response?.data?.message ||
          (Array.isArray(err?.response?.data?.errors) && err.response.data.errors[0]?.message) ||
          'Không thể tạo câu hỏi, vui lòng thử lại.'
      );
    } finally {
      setCreatingQuestion(false);
    }
  };

  const addOption = () => {
    setQuestionForm((prev) => ({
      ...prev,
      options: [
        ...prev.options,
        { id: String(Date.now()), text: '', isCorrect: false },
      ],
    }));
  };

  const removeOption = (id: string) => {
    if (questionForm.options.length <= 2) {
      setCreateQuestionError('Câu hỏi trắc nghiệm cần ít nhất 2 lựa chọn.');
      return;
    }
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.id !== id),
    }));
  };

  const updateOption = (id: string, field: 'text' | 'isCorrect', value: string | boolean) => {
    setQuestionForm((prev) => ({
      ...prev,
      options: prev.options.map((opt) =>
        opt.id === id ? { ...opt, [field]: value } : opt
      ),
    }));
  };

  const addExpectedAnswer = () => {
    setQuestionForm((prev) => ({
      ...prev,
      expectedAnswers: [...prev.expectedAnswers, ''],
    }));
  };

  const removeExpectedAnswer = (index: number) => {
    if (questionForm.expectedAnswers.length <= 1) {
      setCreateQuestionError('Câu hỏi tự luận cần ít nhất một đáp án mong đợi.');
      return;
    }
    setQuestionForm((prev) => ({
      ...prev,
      expectedAnswers: prev.expectedAnswers.filter((_, i) => i !== index),
    }));
  };

  const filteredQuestionBank = questionBank.filter((q) => {
    // Filter out questions already in exam
    const inExam = exam?.questions.some((eq) => eq.question._id === q._id);
    if (inExam) return false;

    if (filterType && q.type !== filterType) return false;
    if (filterDifficulty && q.difficulty !== filterDifficulty) return false;
    return true;
  });

  const totalPoints = exam?.questions.reduce(
    (sum, q) => sum + q.question.points * q.weight,
    0
  ) || 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải câu hỏi...</p>
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải dữ liệu</h2>
            <p className="text-gray-600 mb-4">{error || 'Bài kiểm tra không tồn tại.'}</p>
            <button
              type="button"
              onClick={() => router.push(`/instructor/courses/${courseId}/exams/${examId}/edit`)}
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
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quản lý câu hỏi</h1>
              <p className="text-sm text-gray-600 mt-1">{exam.title}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Thêm từ ngân hàng
              </button>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo câu hỏi mới
              </button>
              <Link
                href={`/instructor/courses/${courseId}/exams/${examId}/edit`}
                className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                ← Quay lại
              </Link>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-lg shadow border border-gray-100 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Tổng số câu hỏi: <span className="font-semibold text-gray-900">{exam.questions.length}</span>
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Tổng điểm: <span className="font-semibold text-gray-900">{totalPoints}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Questions list */}
          <div className="bg-white rounded-lg shadow border border-gray-100">
            <div className="px-5 py-3 border-b">
              <h2 className="text-sm font-semibold text-gray-900">
                Danh sách câu hỏi ({exam.questions.length})
              </h2>
            </div>

            {exam.questions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-sm text-gray-500 mb-4">Chưa có câu hỏi nào trong bài kiểm tra.</p>
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm câu hỏi đầu tiên
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={exam.questions.map((q) => q.question._id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="divide-y">
                    {exam.questions.map((question, index) => (
                      <div key={question.question._id} className="px-5 py-4">
                        <SortableQuestionItem
                          question={question}
                          index={index}
                          onRemove={handleRemoveQuestion}
                          onEdit={handleEditQuestion}
                          onUpdatePoints={handleUpdateQuestionPoints}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </main>

      {/* Add question modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="px-5 py-3 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Thêm câu hỏi từ ngân hàng</h2>
              <button
                type="button"
                onClick={() => !saving && setShowAddModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="px-5 py-3 border-b flex items-center gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Loại câu hỏi</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as QuestionType | '')}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Tất cả</option>
                  <option value="single_choice">Trắc nghiệm (1 đáp án)</option>
                  <option value="multiple_choice">Trắc nghiệm (nhiều đáp án)</option>
                  <option value="short_answer">Tự luận</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Độ khó</label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value as QuestionDifficulty | '')}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                >
                  <option value="">Tất cả</option>
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {filteredQuestionBank.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  {questionBank.length === 0
                    ? 'Chưa có câu hỏi nào trong ngân hàng câu hỏi.'
                    : 'Không có câu hỏi nào phù hợp với bộ lọc.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredQuestionBank.map((question) => (
                    <div
                      key={question._id}
                      className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-500">
                              {question.type === 'single_choice'
                                ? 'Trắc nghiệm (1 đáp án)'
                                : question.type === 'multiple_choice'
                                ? 'Trắc nghiệm (nhiều đáp án)'
                                : 'Tự luận'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs ${
                                question.difficulty === 'easy'
                                  ? 'bg-green-100 text-green-700'
                                  : question.difficulty === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {question.difficulty === 'easy'
                                ? 'Dễ'
                                : question.difficulty === 'medium'
                                ? 'Trung bình'
                                : 'Khó'}
                            </span>
                            <span className="text-xs text-gray-500">{question.points} điểm</span>
                          </div>
                          <p className="text-sm text-gray-800">{question.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddQuestion(question._id)}
                          disabled={saving}
                          className="ml-4 px-3 py-1.5 rounded-md bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create question modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-3 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">Tạo câu hỏi mới</h2>
              <button
                type="button"
                onClick={() => !creatingQuestion && setShowCreateModal(false)}
                className="text-gray-500 hover:text-gray-700"
                disabled={creatingQuestion}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Loại câu hỏi <span className="text-red-500">*</span>
                </label>
                <select
                  value={questionForm.type}
                  onChange={(e) => {
                    setQuestionForm((prev) => ({
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
                  disabled={creatingQuestion}
                  required
                >
                  <option value="single_choice">Trắc nghiệm (1 đáp án)</option>
                  <option value="multiple_choice">Trắc nghiệm (nhiều đáp án)</option>
                  <option value="short_answer">Tự luận</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Độ khó <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={questionForm.difficulty}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({
                        ...prev,
                        difficulty: e.target.value as QuestionDifficulty,
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={creatingQuestion}
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
                    value={questionForm.points}
                    onChange={(e) =>
                      setQuestionForm((prev) => ({ ...prev, points: e.target.value }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={creatingQuestion}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nội dung câu hỏi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={questionForm.text}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, text: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  disabled={creatingQuestion}
                  required
                  placeholder="Nhập nội dung câu hỏi..."
                />
              </div>

              {/* Options for choice questions */}
              {(questionForm.type === 'single_choice' || questionForm.type === 'multiple_choice') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Các lựa chọn <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addOption}
                      disabled={creatingQuestion}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Thêm lựa chọn
                    </button>
                  </div>
                  <div className="space-y-2">
                    {questionForm.options.map((option, index) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <input
                          type={questionForm.type === 'single_choice' ? 'radio' : 'checkbox'}
                          checked={option.isCorrect}
                          onChange={(e) => updateOption(option.id, 'isCorrect', e.target.checked)}
                          disabled={creatingQuestion}
                          className="flex-shrink-0"
                        />
                        <input
                          type="text"
                          value={option.text}
                          onChange={(e) => updateOption(option.id, 'text', e.target.value)}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Lựa chọn ${index + 1}`}
                          disabled={creatingQuestion}
                        />
                        {questionForm.options.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeOption(option.id)}
                            disabled={creatingQuestion}
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
              {questionForm.type === 'short_answer' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Đáp án mong đợi <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addExpectedAnswer}
                      disabled={creatingQuestion}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      + Thêm đáp án
                    </button>
                  </div>
                  <div className="space-y-2">
                    {questionForm.expectedAnswers.map((answer, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={answer}
                          onChange={(e) => {
                            const newAnswers = [...questionForm.expectedAnswers];
                            newAnswers[index] = e.target.value;
                            setQuestionForm((prev) => ({ ...prev, expectedAnswers: newAnswers }));
                          }}
                          className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Đáp án ${index + 1}`}
                          disabled={creatingQuestion}
                        />
                        {questionForm.expectedAnswers.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeExpectedAnswer(index)}
                            disabled={creatingQuestion}
                            className="text-red-600 hover:text-red-700 p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Có thể thêm nhiều đáp án đúng (phân cách bằng dấu phẩy hoặc từng dòng)
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <input
                  type="text"
                  value={questionForm.tags}
                  onChange={(e) =>
                    setQuestionForm((prev) => ({ ...prev, tags: e.target.value }))
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ví dụ: toán, đại số, hình học (phân cách bằng dấu phẩy)"
                  disabled={creatingQuestion}
                />
              </div>

              {createQuestionError && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {createQuestionError}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => !creatingQuestion && setShowCreateModal(false)}
                  className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={creatingQuestion}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                  disabled={creatingQuestion}
                >
                  {creatingQuestion ? 'Đang tạo...' : 'Tạo và thêm vào bài kiểm tra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

export default function ExamQuestionsPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <ExamQuestionsContent />
    </ProtectedRoute>
  );
}

