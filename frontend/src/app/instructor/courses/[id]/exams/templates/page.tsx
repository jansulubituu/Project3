'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Edit2,
  Trash2,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

interface DifficultyRule {
  level: 'easy' | 'medium' | 'hard';
  ratio: number;
}

interface TypeRule {
  type: 'single_choice' | 'multiple_choice' | 'short_answer';
  ratio: number;
}

interface TopicRule {
  tag: string;
  ratio: number;
}

interface ExamTemplate {
  _id: string;
  title: string;
  description?: string;
  numberOfQuestions: number;
  difficultyDistribution?: DifficultyRule[];
  topicDistribution?: TopicRule[];
  typeDistribution?: TypeRule[];
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  section?: { _id: string; title: string } | null;
  isActive: boolean;
  createdAt: string;
}

function ExamTemplatesContent() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;

  const [templates, setTemplates] = useState<ExamTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ExamTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [sections, setSections] = useState<{ _id: string; title: string }[]>([]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    section: '',
    numberOfQuestions: '10',
    shuffleQuestions: true,
    shuffleAnswers: true,
    difficultyDistribution: [
      { level: 'easy' as const, ratio: 30 },
      { level: 'medium' as const, ratio: 50 },
      { level: 'hard' as const, ratio: 20 },
    ],
    typeDistribution: [
      { type: 'single_choice' as const, ratio: 60 },
      { type: 'multiple_choice' as const, ratio: 30 },
      { type: 'short_answer' as const, ratio: 10 },
    ],
    topicDistribution: [] as TopicRule[],
  });

  useEffect(() => {
    if (!courseId) return;
    loadTemplates();
    loadSections();
  }, [courseId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/exam-templates`);
      if (res.data?.success) {
        setTemplates(res.data.templates || []);
      }
    } catch (err: any) {
      console.error('Failed to load templates:', err);
      setError(err?.response?.data?.message || 'Không thể tải templates.');
    } finally {
      setLoading(false);
    }
  };

  const loadSections = async () => {
    try {
      const res = await api.get(`/courses/${courseId}/curriculum`);
      if (res.data?.success) {
        const sectionsList = res.data.sections || [];
        setSections(sectionsList);
      }
    } catch (err) {
      console.error('Failed to load sections:', err);
    }
  };

  const handleCreate = () => {
    setEditingTemplate(null);
    setForm({
      title: '',
      description: '',
      section: '',
      numberOfQuestions: '10',
      shuffleQuestions: true,
      shuffleAnswers: true,
      difficultyDistribution: [
        { level: 'easy', ratio: 30 },
        { level: 'medium', ratio: 50 },
        { level: 'hard', ratio: 20 },
      ],
      typeDistribution: [
        { type: 'single_choice', ratio: 60 },
        { type: 'multiple_choice', ratio: 30 },
        { type: 'short_answer', ratio: 10 },
      ],
      topicDistribution: [],
    });
    setShowCreateModal(true);
  };

  const handleEdit = (template: ExamTemplate) => {
    setEditingTemplate(template);
    setForm({
      title: template.title,
      description: template.description || '',
      section: template.section?._id || '',
      numberOfQuestions: String(template.numberOfQuestions),
      shuffleQuestions: template.shuffleQuestions,
      shuffleAnswers: template.shuffleAnswers,
      difficultyDistribution: template.difficultyDistribution || [
        { level: 'easy', ratio: 30 },
        { level: 'medium', ratio: 50 },
        { level: 'hard', ratio: 20 },
      ],
      typeDistribution: template.typeDistribution || [
        { type: 'single_choice', ratio: 60 },
        { type: 'multiple_choice', ratio: 30 },
        { type: 'short_answer', ratio: 10 },
      ],
      topicDistribution: template.topicDistribution || [],
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Bạn có chắc muốn xóa template này?')) return;

    try {
      await api.delete(`/exam-templates/${templateId}`);
      loadTemplates();
    } catch (err: any) {
      alert('Không thể xóa template: ' + (err?.response?.data?.message || 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    // Validate distributions sum to 100
    const difficultySum = form.difficultyDistribution.reduce((sum, r) => sum + r.ratio, 0);
    if (difficultySum !== 100) {
      setSaveError(`Difficulty distribution must sum to 100 (current: ${difficultySum})`);
      return;
    }

    const typeSum = form.typeDistribution.reduce((sum, r) => sum + r.ratio, 0);
    if (typeSum !== 100) {
      setSaveError(`Type distribution must sum to 100 (current: ${typeSum})`);
      return;
    }

    try {
      setSaving(true);
      setSaveError(null);

      const payload = {
        section: form.section || null,
        title: form.title,
        description: form.description,
        numberOfQuestions: parseInt(form.numberOfQuestions),
        difficultyDistribution: form.difficultyDistribution,
        typeDistribution: form.typeDistribution,
        topicDistribution: form.topicDistribution,
        shuffleQuestions: form.shuffleQuestions,
        shuffleAnswers: form.shuffleAnswers,
      };

      if (editingTemplate) {
        await api.put(`/exam-templates/${editingTemplate._id}`, payload);
      } else {
        await api.post(`/courses/${courseId}/exam-templates`, payload);
      }

      setShowCreateModal(false);
      loadTemplates();
    } catch (err: any) {
      console.error('Failed to save template:', err);
      setSaveError(err?.response?.data?.message || 'Không thể lưu template.');
    } finally {
      setSaving(false);
    }
  };

  const updateDistribution = (
    type: 'difficulty' | 'type',
    index: number,
    field: 'level' | 'type' | 'ratio',
    value: any
  ) => {
    const key = type === 'difficulty' ? 'difficultyDistribution' : 'typeDistribution';
    const updated = [...form[key]];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, [key]: updated });
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <Link
              href={`/instructor/courses/${courseId}/exams`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại danh sách exam
            </Link>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Exam Templates</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Quản lý templates để tạo exam tự động
                  </p>
                </div>
              </div>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo Template
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow border border-gray-100 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có template nào</h3>
              <p className="text-sm text-gray-600 mb-4">
                Tạo template đầu tiên để bắt đầu sử dụng
              </p>
              <button
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Tạo Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
              {templates.map((template) => (
                <div
                  key={template._id}
                  className="bg-white rounded-lg shadow border border-gray-100 p-5 hover:shadow-md transition-shadow flex flex-col h-full"
                >
                  {/* Header - Fixed height */}
                  <div className="flex items-start justify-between mb-3 min-h-[3.5rem]">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1 pr-2 leading-tight">
                      {template.title}
                    </h3>
                    <div className="flex-shrink-0 ml-2">
                      {template.isActive ? (
                        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>

                  {/* Description - Fixed height */}
                  <div className="mb-3 min-h-[2.5rem]">
                    {template.description ? (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Không có mô tả</p>
                    )}
                  </div>

                  {/* Content - Flexible, grows to fill space */}
                  <div className="space-y-2 text-sm text-gray-600 mb-4 flex-1">
                    <div className="flex justify-between">
                      <span>Số câu hỏi:</span>
                      <span className="font-semibold">{template.numberOfQuestions}</span>
                    </div>
                    {template.section && (
                      <div className="flex justify-between">
                        <span>Section:</span>
                        <span className="truncate ml-2">{template.section.title}</span>
                      </div>
                    )}
                    {template.difficultyDistribution && template.difficultyDistribution.length > 0 && (
                      <div>
                        <span className="font-medium">Độ khó:</span>
                        <div className="mt-1 space-y-1">
                          {template.difficultyDistribution.map((d, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="capitalize">{d.level}:</span>
                              <span>{d.ratio}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {template.typeDistribution && template.typeDistribution.length > 0 && (
                      <div>
                        <span className="font-medium">Loại câu hỏi:</span>
                        <div className="mt-1 space-y-1">
                          {template.typeDistribution.map((t, idx) => (
                            <div key={idx} className="flex justify-between text-xs">
                              <span className="truncate">
                                {t.type === 'single_choice'
                                  ? 'Trắc nghiệm đơn'
                                  : t.type === 'multiple_choice'
                                  ? 'Trắc nghiệm nhiều'
                                  : 'Tự luận'}
                                :
                              </span>
                              <span className="ml-2">{t.ratio}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions - Fixed at bottom */}
                  <div className="flex items-center gap-2 pt-3 border-t mt-auto">
                    <button
                      onClick={() => handleEdit(template)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      Sửa
                    </button>
                    <button
                      onClick={() => handleDelete(template._id)}
                      className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Xóa
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTemplate ? 'Sửa Template' : 'Tạo Template Mới'}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{saveError}</p>
                </div>
              )}

              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Section (Optional)
                </label>
                <select
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">-- Không chọn section --</option>
                  {sections.map((section) => (
                    <option key={section._id} value={section._id}>
                      {section.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Số câu hỏi <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.numberOfQuestions}
                  onChange={(e) => setForm({ ...form, numberOfQuestions: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              {/* Difficulty Distribution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phân bố độ khó (Tổng phải = 100%)
                </label>
                <div className="space-y-2">
                  {form.difficultyDistribution.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={rule.level}
                        onChange={(e) =>
                          updateDistribution('difficulty', idx, 'level', e.target.value)
                        }
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="easy">Dễ</option>
                        <option value="medium">Trung bình</option>
                        <option value="hard">Khó</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.ratio}
                        onChange={(e) =>
                          updateDistribution('difficulty', idx, 'ratio', parseInt(e.target.value) || 0)
                        }
                        className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">
                    Tổng: {form.difficultyDistribution.reduce((sum, r) => sum + r.ratio, 0)}%
                  </p>
                </div>
              </div>

              {/* Type Distribution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phân bố loại câu hỏi (Tổng phải = 100%)
                </label>
                <div className="space-y-2">
                  {form.typeDistribution.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={rule.type}
                        onChange={(e) =>
                          updateDistribution('type', idx, 'type', e.target.value)
                        }
                        className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      >
                        <option value="single_choice">Trắc nghiệm đơn</option>
                        <option value="multiple_choice">Trắc nghiệm nhiều</option>
                        <option value="short_answer">Tự luận</option>
                      </select>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={rule.ratio}
                        onChange={(e) =>
                          updateDistribution('type', idx, 'ratio', parseInt(e.target.value) || 0)
                        }
                        className="w-20 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                      <span className="text-sm text-gray-600">%</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500">
                    Tổng: {form.typeDistribution.reduce((sum, r) => sum + r.ratio, 0)}%
                  </p>
                </div>
              </div>

              {/* Shuffle Options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.shuffleQuestions}
                    onChange={(e) => setForm({ ...form, shuffleQuestions: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Xáo trộn câu hỏi</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.shuffleAnswers}
                    onChange={(e) => setForm({ ...form, shuffleAnswers: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Xáo trộn đáp án</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Đang lưu...' : editingTemplate ? 'Cập nhật' : 'Tạo'}
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

export default function ExamTemplatesPage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <ExamTemplatesContent />
    </ProtectedRoute>
  );
}
