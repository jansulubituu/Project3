'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';

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

function EditCourseContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const courseId = params?.id;

  const [form, setForm] = useState<CourseFormData | null>(null);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailError, setThumbnailError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!courseId) return;
      try {
        setLoading(true);
        setError(null);

        const [courseRes, categoriesRes] = await Promise.all([
          api.get(`/courses/${courseId}`),
          api.get('/categories'),
        ]);

        if (categoriesRes.data?.success) {
          setCategories(categoriesRes.data.categories || []);
        }

        if (courseRes.data?.success) {
          const c = courseRes.data.course;
          setForm({
            title: c.title,
            shortDescription: c.shortDescription || '',
            description: c.description || '',
            category: c.category?._id || '',
            subcategory: c.subcategory?._id || '',
            level: c.level || 'all_levels',
            price: c.price || 0,
            discountPrice: c.discountPrice || undefined,
            thumbnail: c.thumbnail || '',
            language: c.language || 'English',
            status: c.status || 'draft',
          });
        } else {
          setError('Không tìm thấy khóa học.');
        }
      } catch (err) {
        console.error('Failed to load course:', err);
        setError('Không thể tải dữ liệu khóa học.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    if (!form) return;
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]:
        name === 'price' || name === 'discountPrice'
          ? value === ''
            ? undefined
            : Number(value)
          : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !courseId) return;

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

    if (form.discountPrice !== undefined && form.discountPrice !== null && typeof form.discountPrice === 'number' && form.discountPrice >= form.price) {
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

      if (payload.discountPrice === undefined || payload.discountPrice === null || payload.discountPrice === '' || (typeof payload.discountPrice === 'number' && isNaN(payload.discountPrice))) {
        delete payload.discountPrice;
      }
      if (!payload.subcategory) {
        delete payload.subcategory;
      }

      const res = await api.put(`/courses/${courseId}`, payload);
      if (res.data?.success) {
        setSuccess('Cập nhật khóa học thành công.');
      } else {
        setError(res.data?.message || 'Cập nhật khóa học thất bại.');
      }
    } catch (err: any) {
      console.error('Failed to save course:', err);
      
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
          err?.response?.data?.error ||
          'Không thể cập nhật khóa học. Vui lòng kiểm tra lại thông tin và thử lại.';
        setError(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!courseId || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (!file || !form) return;

    setThumbnailUploading(true);
    setThumbnailError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post(`/courses/${courseId}/thumbnail`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success && res.data.thumbnail) {
        setForm({ ...form, thumbnail: res.data.thumbnail });
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
      // reset input value
      e.target.value = '';
    }
  };

  if (loading || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải dữ liệu khóa học...</p>
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Chỉnh sửa khóa học</h1>
            <p className="text-sm text-gray-600 mb-6">
              Admin có thể chỉnh sửa mọi khóa học, giảng viên chỉ chỉnh sửa khóa học của mình.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tiêu đề khóa học <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={(e) => {
                    handleChange(e);
                    if (fieldErrors.title) {
                      setFieldErrors((prev) => {
                        const newErrors = { ...prev };
                        delete newErrors.title;
                        return newErrors;
                      });
                    }
                  }}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    fieldErrors.title ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
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
                {fieldErrors.title && (
                  <p className="mt-1 text-xs text-red-600 flex items-center">
                    <span className="mr-1">⚠️</span>
                    {fieldErrors.title}
                  </p>
                )}
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả ngắn <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  Mô tả chi tiết giúp học viên hiểu rõ về khóa học. Tối thiểu 50 ký tự, không giới hạn tối đa.
                </p>
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
                    Giá (VND)
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={form.price}
                    min={0}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Giá khuyến mãi (VND)
                  </label>
                  <input
                    type="number"
                    name="discountPrice"
                    value={form.discountPrice ?? ''}
                    min={0}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
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
                    {fieldErrors.thumbnail && (
                      <p className="mt-1 text-xs text-red-600 flex items-center">
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
                          onError={() => {
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

              {/* Status (readonly for instructor if needed – backend vẫn enforce) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trạng thái <span className="text-xs text-gray-500 font-normal">(Tùy chọn)</span>
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Bản nháp (Mặc định)</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  <strong>Bản nháp:</strong> Chỉ bạn có thể xem và chỉnh sửa. <strong>Đã xuất bản:</strong> Khóa học hiển thị công khai cho học viên. <strong>Đã lưu trữ:</strong> Ẩn khỏi danh sách nhưng vẫn giữ dữ liệu. Lưu ý: Backend sẽ kiểm tra quyền khi thay đổi trạng thái.
                </p>
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
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
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

export default function EditCoursePage() {
  return (
    <ProtectedRoute allowedRoles={['instructor', 'admin']}>
      <EditCourseContent />
    </ProtectedRoute>
  );
}


