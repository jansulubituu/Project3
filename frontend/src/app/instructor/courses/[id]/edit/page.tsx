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
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload: any = { ...form };

      if (payload.discountPrice === undefined || payload.discountPrice === null || payload.discountPrice === '') {
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
      const message =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Không thể cập nhật khóa học. Vui lòng thử lại.';
      setError(message);
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
                  Tiêu đề khóa học
                </label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả ngắn
                </label>
                <textarea
                  name="shortDescription"
                  value={form.shortDescription}
                  onChange={handleChange}
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Mô tả chi tiết
                </label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={6}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Category & Level */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Danh mục
                  </label>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Chọn danh mục</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Cấp độ
                  </label>
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="beginner">Cơ bản</option>
                    <option value="intermediate">Trung bình</option>
                    <option value="advanced">Nâng cao</option>
                    <option value="all_levels">Mọi cấp độ</option>
                  </select>
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
                    Ảnh thumbnail
                  </label>
                  <div className="mt-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {thumbnailUploading && (
                      <p className="text-xs text-gray-500">Đang upload thumbnail...</p>
                    )}
                    {thumbnailError && (
                      <p className="text-xs text-red-600">{thumbnailError}</p>
                    )}
                    <input
                      type="text"
                      name="thumbnail"
                      value={form.thumbnail}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Hoặc dán URL thumbnail thủ công"
                    />
                    {form.thumbnail && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Preview:</p>
                        <img
                          src={form.thumbnail}
                          alt="Course thumbnail preview"
                          className="h-32 w-full object-cover rounded-md border border-gray-200"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Ngôn ngữ
                  </label>
                  <input
                    type="text"
                    name="language"
                    value={form.language}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Status (readonly for instructor if needed – backend vẫn enforce) */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Trạng thái
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">Bản nháp</option>
                  <option value="published">Đã xuất bản</option>
                  <option value="archived">Đã lưu trữ</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Lưu ý: Publish/Archive cũng có thể được điều khiển qua action riêng, backend vẫn kiểm tra quyền.
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


