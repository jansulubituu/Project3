'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type CourseStatus = 'draft' | 'published' | 'archived';

interface CourseFormData {
  title: string;
  shortDescription: string;
  description: string;
  category: string;
  subcategory?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  price: number;
  discountPrice?: number;
  thumbnail: string;
  language: string;
  status: CourseStatus;
}

interface CategoryOption {
  _id: string;
  name: string;
  slug: string;
}

interface InstructorOption {
  _id: string;
  fullName: string;
  email: string;
}

function NewCourseContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [form, setForm] = useState<CourseFormData>({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    subcategory: '',
    level: 'all_levels',
    price: 0,
    discountPrice: undefined,
    thumbnail: '',
    language: 'English',
    status: 'draft',
  });

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [selectedInstructor, setSelectedInstructor] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);
  const [learningOutcomesText, setLearningOutcomesText] = useState('');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const requests = [api.get('/categories')];

        if (isAdmin) {
          requests.push(api.get('/users', { params: { role: 'instructor', limit: 1000 } }));
        }

        const [categoriesRes, instructorsRes] = await Promise.all(requests);

        if (categoriesRes.data?.success) {
          setCategories(categoriesRes.data.categories || []);
        }

        if (isAdmin && instructorsRes?.data?.success) {
          setInstructors(instructorsRes.data.users || []);
        }
      } catch (err) {
        console.error('Failed to load data for new course:', err);
        setError('Không thể tải dữ liệu danh mục/giảng viên.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === 'price' || name === 'discountPrice'
          ? value === ''
            ? undefined
            : Number(value)
          : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(null);

    // Client-side validation
    const errors: Record<string, string> = {};

    if (!form.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề khóa học.';
    }

    if (!form.shortDescription.trim()) {
      errors.shortDescription = 'Vui lòng nhập mô tả ngắn.';
    }

    if (!form.description.trim()) {
      errors.description = 'Vui lòng nhập mô tả chi tiết.';
    } else if (form.description.trim().length < 50) {
      errors.description = 'Mô tả chi tiết phải có ít nhất 50 ký tự.';
    }

    if (!form.category) {
      errors.category = 'Vui lòng chọn danh mục.';
    }

    if (!form.thumbnail.trim()) {
      errors.thumbnail = 'Vui lòng tải lên ảnh thumbnail hoặc nhập URL ảnh.';
    }

    if (!form.language.trim()) {
      errors.language = 'Vui lòng nhập ngôn ngữ giảng dạy.';
    }

    const outcomes = learningOutcomesText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (outcomes.length < 4) {
      errors.learningOutcomes = 'Vui lòng nhập ít nhất 4 mục tiêu học tập.';
    }

    if (isAdmin && !selectedInstructor) {
      errors.instructor = 'Vui lòng chọn giảng viên phụ trách.';
    }

    if (form.discountPrice !== undefined && form.discountPrice !== null && form.discountPrice !== '' && form.discountPrice >= form.price) {
      errors.discountPrice = 'Giá khuyến mãi phải nhỏ hơn giá gốc.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      // Scroll to first error
      const firstErrorField = Object.keys(errors)[0];
      const element = document.querySelector(`[name="${firstErrorField}"]`) || 
                      document.querySelector(`#${firstErrorField}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        (element as HTMLElement).focus();
      }
      return;
    }

    try {
      setSaving(true);

      const payload: any = { ...form };

      payload.learningOutcomes = outcomes;

      if (payload.discountPrice === undefined || payload.discountPrice === null || payload.discountPrice === '') {
        delete payload.discountPrice;
      }
      if (!payload.subcategory) {
        delete payload.subcategory;
      }
      if (isAdmin && selectedInstructor) {
        payload.instructor = selectedInstructor;
      }

      const res = await api.post('/courses', payload);
      if (res.data?.success && res.data.course?._id) {
        setSuccess('Tạo khóa học thành công.');
        // chuyển sang trang edit chi tiết khóa học vừa tạo
        setTimeout(() => {
          router.push(`/instructor/courses/${res.data.course._id}/edit`);
        }, 1000);
      } else {
        setError(res.data?.message || 'Tạo khóa học thất bại.');
      }
    } catch (err: any) {
      console.error('Failed to create course:', err);
      
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
        // General error message
        const message =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Không thể tạo khóa học. Vui lòng kiểm tra lại thông tin và thử lại.';
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file) return;

    setThumbnailUploading(true);
    setThumbnailError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/uploads/image?folder=edulearn/course-thumbnails', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.url) {
        setForm((prev) => ({ ...prev, thumbnail: res.data.url }));
        setSuccess('Upload thumbnail thành công.');
      } else {
        setThumbnailError(res.data?.message || 'Upload thumbnail thất bại.');
      }
    } catch (err: any) {
      console.error('Failed to upload thumbnail:', err);
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Không thể upload thumbnail. Vui lòng thử lại.';
      setThumbnailError(message);
    } finally {
      setThumbnailUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
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
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 text-sm text-gray-600 hover:text-gray-800"
          >
            ← Quay lại
          </button>

          <div className="bg-white rounded-xl shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Tạo khóa học mới</h1>
            <p className="text-sm text-gray-600 mb-6">
              Giảng viên tạo khóa học cho chính mình. Admin có thể chọn giảng viên để tạo khóa học thay.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Có lỗi xảy ra</h3>
                    <p className="mt-1 text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">{success}</p>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Instructor select for admin */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Giảng viên phụ trách <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedInstructor}
                    onChange={(e) => {
                      setSelectedInstructor(e.target.value);
                      if (fieldErrors.instructor) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.instructor;
                          return newErrors;
                        });
                      }
                    }}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.instructor ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Chọn giảng viên</option>
                    {instructors.map((inst) => (
                      <option key={inst._id} value={inst._id}>
                        {inst.fullName} ({inst.email})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.instructor && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.instructor}
                    </p>
                  )}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tiêu đề khóa học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ví dụ: Lập trình React từ cơ bản đến nâng cao"
                  maxLength={200}
                  required
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Tiêu đề hấp dẫn, mô tả rõ nội dung khóa học (tối đa 200 ký tự)
                  </p>
                  <span className="text-xs text-gray-400">
                    {form.title.length}/200
                  </span>
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả ngắn <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={(e) => {
                    handleChange(e);
                    if (fieldErrors.shortDescription) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.shortDescription;
                        return newErrors;
                      });
                    }
                  }}
                  rows={2}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.shortDescription ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Mô tả ngắn gọn về khóa học trong 1-2 câu..."
                  maxLength={200}
                  required
                />
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Mô tả ngắn gọn, hấp dẫn để hiển thị trong danh sách khóa học (tối đa 200 ký tự)
                  </p>
                  <span className="text-xs text-gray-400">
                    {form.shortDescription.length}/200
                  </span>
                </div>
                {fieldErrors.shortDescription && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.shortDescription}
                  </p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Mô tả chi tiết về nội dung khóa học, mục tiêu học tập, đối tượng phù hợp..."
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Mô tả chi tiết giúp học viên hiểu rõ về khóa học. <strong>Tối thiểu 50 ký tự</strong>, không giới hạn tối đa.
                </p>
              </div>

              {/* Learning Outcomes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mục tiêu học tập (Learning Outcomes) <span className="text-red-500">*</span>
                </label>
                <p className="mt-1 text-xs text-gray-500 mb-2">
                  Mỗi dòng là một mục tiêu. <strong>Cần ít nhất 4 dòng</strong> để tạo khóa học. Mục tiêu học tập giúp học viên hiểu rõ những gì họ sẽ đạt được sau khi hoàn thành khóa học.
                </p>
                <textarea
                  value={learningOutcomesText}
                  onChange={(e) => {
                    setLearningOutcomesText(e.target.value);
                    if (fieldErrors.learningOutcomes) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.learningOutcomes;
                        return newErrors;
                      });
                    }
                  }}
                  rows={6}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.learningOutcomes ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder={'Ví dụ:\n- Hiểu được kiến thức cơ bản về React và các khái niệm quan trọng\n- Áp dụng được React Hooks vào các dự án thực tế\n- Xây dựng được ứng dụng React hoàn chỉnh với routing và state management\n- Tối ưu hóa hiệu suất và trải nghiệm người dùng'}
                />
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-500">
                    <strong>Đã nhập:</strong> {learningOutcomesText.split('\n').filter((line) => line.trim()).length} mục tiêu
                    {learningOutcomesText.split('\n').filter((line) => line.trim()).length < 4 && (
                      <span className="text-red-600 ml-1">
                        (Cần ít nhất 4 mục tiêu)
                      </span>
                    )}
                  </p>
                  {fieldErrors.learningOutcomes && (
                    <p className="text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.learningOutcomes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    💡 Tip: Viết mục tiêu cụ thể, có thể đo lường được. Ví dụ: "Hiểu được..." thay vì "Biết về..."
                  </p>
                </div>
              </div>

              {/* Category & Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Danh mục <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={(e) => {
                      handleChange(e);
                      if (fieldErrors.category) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.category;
                          return newErrors;
                        });
                      }
                    }}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.category ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.category && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.category}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Chọn danh mục phù hợp để học viên dễ tìm thấy khóa học của bạn
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cấp độ <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all_levels">Mọi cấp độ (Mặc định)</option>
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Cấp độ phù hợp với khóa học. Chọn "Mọi cấp độ" nếu khóa học phù hợp với tất cả học viên.
                  </p>
                </div>
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Giá (VND) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    min={0}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Giá gốc của khóa học. Nhập <strong>0</strong> nếu khóa học miễn phí.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Giá khuyến mãi (VND) <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="number"
                    name="discountPrice"
                    value={form.discountPrice ?? ''}
                    min={0}
                    onChange={(e) => {
                      handleChange(e);
                      if (fieldErrors.discountPrice) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.discountPrice;
                          return newErrors;
                        });
                      }
                    }}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.discountPrice ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Để trống nếu không có khuyến mãi"
                  />
                  {fieldErrors.discountPrice && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.discountPrice}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Giá khuyến mãi phải <strong>nhỏ hơn giá gốc</strong>. Để trống nếu không có khuyến mãi.
                  </p>
                </div>
              </div>

              {/* Thumbnail & Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ảnh thumbnail <span className="text-red-500">*</span>
                  </label>
                  <p className="mt-1 mb-2 text-xs text-gray-500">
                    Tải lên ảnh thumbnail hoặc nhập URL ảnh. Ảnh thumbnail giúp khóa học của bạn thu hút học viên hơn.
                  </p>
                  <div className="mt-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {thumbnailUploading && (
                      <p className="text-xs text-blue-600 flex items-center">
                        <span className="mr-1">⏳</span>
                        Đang upload thumbnail...
                      </p>
                    )}
                    {thumbnailError && (
                      <p className="text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {thumbnailError}
                      </p>
                    )}
                    <div className="relative">
                      <input
                        type="text"
                        name="thumbnail"
                        id="thumbnail"
                        value={form.thumbnail}
                        onChange={(e) => {
                          handleChange(e);
                          if (fieldErrors.thumbnail) {
                            setFieldErrors((prev) => {
                              const newErrors = { ...prev };
                              delete newErrors.thumbnail;
                              return newErrors;
                            });
                          }
                        }}
                        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          fieldErrors.thumbnail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="Hoặc dán URL thumbnail thủ công"
                      />
                    </div>
                    {fieldErrors.thumbnail && (
                      <p className="text-xs text-red-600 flex items-center">
                        <span className="mr-1">⚠️</span>
                        {fieldErrors.thumbnail}
                      </p>
                    )}
                    {form.thumbnail && !fieldErrors.thumbnail && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        <img
                          src={form.thumbnail}
                          alt="Course thumbnail preview"
                          className="h-32 w-full object-cover rounded-md border border-gray-200"
                          onError={(e) => {
                            setFieldErrors((prev) => ({
                              ...prev,
                              thumbnail: 'URL ảnh không hợp lệ hoặc không thể tải được.',
                            }));
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ngôn ngữ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="language"
                    value={form.language}
                    onChange={(e) => {
                      handleChange(e);
                      if (fieldErrors.language) {
                        setFieldErrors((prev) => {
                          const newErrors = { ...prev };
                          delete newErrors.language;
                          return newErrors;
                        });
                      }
                    }}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      fieldErrors.language ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ví dụ: Tiếng Việt, English, 中文"
                    required
                  />
                  {fieldErrors.language && (
                    <p className="mt-1 text-xs text-red-600 flex items-center">
                      <span className="mr-1">⚠️</span>
                      {fieldErrors.language}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Ngôn ngữ giảng dạy chính của khóa học. Mặc định là "English".
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? 'Đang tạo...' : 'Tạo khóa học'}
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

export default function NewCoursePage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <NewCourseContent />
    </ProtectedRoute>
  );
}


