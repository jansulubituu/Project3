'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
// import * as pdfjsLib from 'pdfjs-dist'; // Moved to dynamic import
import mammoth from 'mammoth';
import { 
  Sparkles, 
  ArrowLeft, 
  Upload, 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Book,
  Send
} from 'lucide-react';

import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

// Set up PDF.js worker
// Set up PDF.js worker (configured dynamically)
// pdfjsLib.GlobalWorkerOptions.workerSrc = ...

interface Section {
  _id: string;
  title: string;
}

interface Lesson {
  _id: string;
  title: string;
  section: string;
}

interface PromptTemplate {
  _id: string;
  name: string;
  description: string;
  promptText: string;
}

interface GenerationJob {
  _id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  resultExamId?: string | { _id: string; id: string } | null;
  resultQuestionIds?: string[];
  createdAt: string;
}

function AiExamGenerateContent() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);

  // Form state
  const [inputType, setInputType] = useState<'prompt_only' | 'course_material' | 'uploaded_file'>('prompt_only');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedLessons, setSelectedLessons] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');

  // Job state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<GenerationJob | null>(null);
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (!courseId) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load sections and lessons
        const curriculumRes = await api.get(`/courses/${courseId}/curriculum`);
        if (curriculumRes.data?.success) {
          const sectionsList = curriculumRes.data.sections || [];
          setSections(sectionsList);

          // Extract lessons from sections
          const allLessons: Lesson[] = [];
          sectionsList.forEach((section: any) => {
            if (section.lessons && Array.isArray(section.lessons)) {
              section.lessons.forEach((lesson: any) => {
                allLessons.push({
                  _id: lesson._id,
                  title: lesson.title,
                  section: section._id,
                });
              });
            }
          });
          setLessons(allLessons);
        }

        // Load prompt templates
        try {
          const templatesRes = await api.get('/ai/prompt-templates');
          if (templatesRes.data?.success && Array.isArray(templatesRes.data.templates)) {
            setTemplates(templatesRes.data.templates);
          }
        } catch (err) {
          console.error('Failed to load prompt templates:', err);
          // Don't fail the whole page if templates fail
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        setError(err?.response?.data?.message || 'Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [courseId]);

  // Poll job status
  useEffect(() => {
    if (!currentJob || currentJob.status === 'completed' || currentJob.status === 'failed') {
      setPolling(false);
      return;
    }

    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/ai/jobs/${currentJob._id}`);
        if (res.data?.success) {
          setCurrentJob(res.data.job);
          if (res.data.job.status === 'completed' || res.data.job.status === 'failed') {
            setPolling(false);
          }
        }
      } catch (err) {
        console.error('Failed to poll job status:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentJob]);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find((t) => t._id === templateId);
    if (template) {
      setPrompt(template.promptText);
    }
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfjs: any = pdfjsLib.default || pdfjsLib;
      
      if (!pdfjs.GlobalWorkerOptions) {
          throw new Error('Could not find GlobalWorkerOptions in pdfjs-dist');
      }

      pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      let text = '';
    
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');
          text += pageText + '\n\n';
      }
    
      return text;
    } catch (error) {
      console.error('Error loading PDF.js:', error);
      throw new Error('Failed to load PDF processor');
    }
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const extractTextFromTxt = async (file: File): Promise<string> => {
    return await file.text();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      setIsProcessingFile(true);
      setFileContent('');
      setSubmitError(null);

      try {
        let text = '';
        if (file.type === 'application/pdf') {
          text = await extractTextFromPdf(file);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          text = await extractTextFromDocx(file);
        } else if (file.type === 'text/plain') {
          text = await extractTextFromTxt(file);
        } else {
          // Fallback or error
          text = `File type: ${file.type} (Content extraction not supported for this type)`;
        }
        
        console.log('Extracted text length:', text.length);
        setFileContent(text);
      } catch (err) {
        console.error('Error extracting text:', err);
        setSubmitError('Không thể đọc nội dung file. Vui lòng thử file khác.');
      } finally {
        setIsProcessingFile(false);
      }
    }
  };

  const handleLessonToggle = (lessonId: string) => {
    setSelectedLessons((prev) =>
      prev.includes(lessonId) ? prev.filter((id) => id !== lessonId) : [...prev, lessonId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      // Validate inputs
      if (!prompt.trim()) {
        setSubmitError('Vui lòng nhập prompt hoặc chọn template.');
        setSubmitting(false);
        return;
      }

      if (inputType === 'course_material' && selectedLessons.length === 0) {
        setSubmitError('Vui lòng chọn ít nhất một bài học.');
        setSubmitting(false);
        return;
      }

      if (inputType === 'uploaded_file' && !uploadedFile) {
        setSubmitError('Vui lòng tải lên file.');
        setSubmitting(false);
        return;
      }

      if (inputType === 'uploaded_file' && !fileContent && !isProcessingFile) {
          setSubmitError('Không thể đọc nội dung file hoặc file rỗng.');
          setSubmitting(false);
          return;
      }

      if (isProcessingFile) {
          setSubmitError('Đang xử lý file, vui lòng đợi...');
          setSubmitting(false);
          return;
      }

      // Build sources
      const sources: any[] = [];
      if (inputType === 'course_material') {
        selectedLessons.forEach((lessonId) => {
          sources.push({
            type: 'lesson',
            lessonId,
          });
        });
      } else if (inputType === 'uploaded_file' && uploadedFile) {
        sources.push({
          type: 'text',
          textExcerpt: `File content from ${uploadedFile.name}:\n\n${fileContent.substring(0, 50000)}`, // Limit content size for safety
        });
      }

      const payload = {
        course: courseId,
        section: selectedSection || null,
        inputType,
        sources,
        prompt: prompt.trim(),
      };

      const res = await api.post('/ai/exams/generate', payload);
      if (res.data?.success) {
        setCurrentJob(res.data.job);
        setSubmitError(null);
      } else {
        setSubmitError(res.data?.message || 'Không thể tạo job.');
      }
    } catch (err: any) {
      console.error('Failed to create generation job:', err);
      setSubmitError(
        err?.response?.data?.message || 'Không thể tạo job, vui lòng thử lại.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to extract exam ID (handle both string and object formats)
  const getExamId = (examId: string | { _id: string; id: string } | null | undefined): string | null => {
    if (!examId) return null;
    if (typeof examId === 'string') return examId;
    if (typeof examId === 'object' && examId !== null) {
      return examId._id || examId.id || null;
    }
    return null;
  };

  const handlePublishExam = async () => {
    const examId = getExamId(currentJob?.resultExamId);
    if (!examId) {
      alert('Không tìm thấy exam ID');
      return;
    }

    try {
      const res = await api.post(`/ai/exams/${examId}/publish`);
      if (res.data?.success) {
        router.push(`/instructor/courses/${courseId}/exams/${examId}/edit`);
      } else {
        alert('Không thể publish exam: ' + (res.data?.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Failed to publish exam:', err);
      alert('Không thể publish exam: ' + (err?.response?.data?.message || 'Unknown error'));
    }
  };

  const handleViewExam = () => {
    const examId = getExamId(currentJob?.resultExamId);
    if (examId) {
      router.push(`/instructor/courses/${courseId}/exams/${examId}/edit`);
    } else {
      console.error('No exam ID found:', currentJob?.resultExamId);
      alert('Không tìm thấy exam ID');
    }
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

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center px-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải dữ liệu</h2>
            <p className="text-gray-600 mb-4">{error}</p>
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
              href={`/instructor/courses/${courseId}/exams`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Quay lại danh sách exam
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tạo Exam bằng AI</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Sử dụng AI để tự động tạo câu hỏi từ tài liệu học
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Panel */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow border border-gray-100">
                <div className="px-5 py-3 border-b">
                  <h2 className="text-sm font-semibold text-gray-900">Cấu hình tạo exam</h2>
                </div>

                <form onSubmit={handleSubmit} className="px-5 py-4 space-y-6">
                  {/* Input Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nguồn dữ liệu
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setInputType('prompt_only')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          inputType === 'prompt_only'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <FileText className="w-5 h-5 text-gray-700 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Prompt Only</p>
                        <p className="text-xs text-gray-500 mt-1">Chỉ dùng prompt</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputType('course_material')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          inputType === 'course_material'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Book className="w-5 h-5 text-gray-700 mb-2" />
                        <p className="text-sm font-medium text-gray-900">Bài học</p>
                        <p className="text-xs text-gray-500 mt-1">Từ nội dung khóa học</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputType('uploaded_file')}
                        className={`p-4 rounded-lg border-2 text-left transition-colors ${
                          inputType === 'uploaded_file'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Upload className="w-5 h-5 text-gray-700 mb-2" />
                        <p className="text-sm font-medium text-gray-900">File</p>
                        <p className="text-xs text-gray-500 mt-1">Tải lên tài liệu</p>
                      </button>
                    </div>
                  </div>

                  {/* Section Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Section (Optional)
                    </label>
                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={submitting}
                    >
                      <option value="">-- Chọn section (hoặc bỏ qua) --</option>
                      {sections.map((section) => (
                        <option key={section._id} value={section._id}>
                          {section.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Course Material Selection */}
                  {inputType === 'course_material' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chọn bài học <span className="text-red-500">*</span>
                      </label>
                      <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                        {lessons.length === 0 ? (
                          <p className="text-sm text-gray-500 p-4">Chưa có bài học nào.</p>
                        ) : (
                          <div className="divide-y">
                            {lessons.map((lesson) => (
                              <label
                                key={lesson._id}
                                className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedLessons.includes(lesson._id)}
                                  onChange={() => handleLessonToggle(lesson._id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  disabled={submitting}
                                />
                                <span className="ml-3 text-sm text-gray-900">{lesson.title}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedLessons.length > 0 && (
                        <p className="mt-2 text-xs text-gray-500">
                          Đã chọn {selectedLessons.length} bài học
                        </p>
                      )}
                    </div>
                  )}

                  {/* File Upload */}
                  {inputType === 'uploaded_file' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tải lên file <span className="text-red-500">*</span>
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <input
                          type="file"
                          onChange={handleFileChange}
                          className="hidden"
                          id="file-upload"
                          accept=".pdf,.doc,.docx,.txt"
                          disabled={submitting || isProcessingFile}
                        />
                        <label
                          htmlFor="file-upload"
                          className={`inline-block px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer ${isProcessingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {isProcessingFile ? 'Đang đọc file...' : 'Chọn file'}
                        </label>
                        {uploadedFile && (
                          <p className="mt-2 text-sm text-gray-600">
                            Đã chọn: {uploadedFile.name}
                          </p>
                        )}
                        {fileContent && (
                            <p className="mt-1 text-xs text-green-600">
                                Đã trích xuất nội dung ({fileContent.length} ký tự)
                                {fileContent.length > 50000 && <span className="text-orange-500 ml-1">(Sẽ lấy 50k ký tự đầu)</span>}
                            </p>
                        )}
                        <p className="mt-2 text-xs text-gray-500">
                          Hỗ trợ: PDF, DOC, DOCX, TXT (tối đa 10MB)
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Prompt Template */}
                  {templates.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Template (Optional)
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => handleTemplateSelect(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={submitting}
                      >
                        <option value="">-- Chọn template hoặc tự nhập --</option>
                        {templates.map((template) => (
                          <option key={template._id} value={template._id}>
                            {template.name}
                          </option>
                        ))}
                      </select>
                      {selectedTemplate && (
                        <p className="mt-1 text-xs text-gray-500">
                          {templates.find((t) => t._id === selectedTemplate)?.description}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Prompt Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prompt <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={6}
                      placeholder="Ví dụ: Tạo 10 câu hỏi trắc nghiệm về lập trình React với độ khó trung bình..."
                      disabled={submitting}
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Mô tả chi tiết yêu cầu của bạn: số lượng câu hỏi, độ khó, chủ đề, định dạng...
                    </p>
                  </div>

                  {submitError && (
                    <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                      {submitError}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <Link
                      href={`/instructor/courses/${courseId}/exams`}
                      className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Hủy
                    </Link>
                    <button
                      type="submit"
                      className="inline-flex items-center px-6 py-2 rounded-md bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-60"
                      disabled={submitting || polling || isProcessingFile}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Đang tạo job...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Tạo Exam bằng AI
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Status Panel */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow border border-gray-100 sticky top-4">
                <div className="px-5 py-3 border-b">
                  <h2 className="text-sm font-semibold text-gray-900">Trạng thái</h2>
                </div>

                <div className="px-5 py-4">
                  {!currentJob ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">
                        Chưa có job nào. Điền form và nhấn &quot;Tạo Exam bằng AI&quot; để bắt đầu.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Status Badge */}
                      <div className="flex items-center justify-center">
                        {currentJob.status === 'pending' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Đang chờ</span>
                          </div>
                        )}
                        {currentJob.status === 'processing' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span className="text-sm font-medium">Đang xử lý</span>
                          </div>
                        )}
                        {currentJob.status === 'completed' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Hoàn thành</span>
                          </div>
                        )}
                        {currentJob.status === 'failed' && (
                          <div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-full">
                            <XCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Thất bại</span>
                          </div>
                        )}
                      </div>

                      {/* Job Info */}
                      <div className="text-sm text-gray-600 space-y-2">
                        <div className="flex justify-between">
                          <span>Job ID:</span>
                          <span className="font-mono text-xs">{currentJob._id.slice(-8)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tạo lúc:</span>
                          <span>
                            {new Date(currentJob.createdAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                            })}
                          </span>
                        </div>
                        {currentJob.resultQuestionIds && currentJob.resultQuestionIds.length > 0 && (
                          <div className="flex justify-between">
                            <span>Số câu hỏi:</span>
                            <span className="font-semibold">{currentJob.resultQuestionIds.length}</span>
                          </div>
                        )}
                      </div>

                      {/* Error Message */}
                      {currentJob.status === 'failed' && currentJob.errorMessage && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                          <p className="text-xs text-red-800">{currentJob.errorMessage}</p>
                        </div>
                      )}

                      {/* Actions */}
                      {currentJob.status === 'completed' && getExamId(currentJob.resultExamId) && (
                        <div className="space-y-2 pt-2">
                          <button
                            type="button"
                            onClick={handleViewExam}
                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                          >
                            Xem & Chỉnh sửa Exam
                          </button>
                          <button
                            type="button"
                            onClick={handlePublishExam}
                            className="w-full px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                          >
                            Publish Exam
                          </button>
                        </div>
                      )}

                      {polling && (
                        <p className="text-xs text-gray-500 text-center">
                          Đang tự động cập nhật trạng thái...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Info Box */}
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Lưu ý</h3>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>AI sẽ tạo exam dựa trên prompt của bạn</li>
                  <li>Quá trình có thể mất vài phút</li>
                  <li>Bạn có thể chỉnh sửa sau khi hoàn thành</li>
                  <li>Exam sẽ ở trạng thái draft cho đến khi publish</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AiExamGeneratePage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <AiExamGenerateContent />
    </ProtectedRoute>
  );
}
