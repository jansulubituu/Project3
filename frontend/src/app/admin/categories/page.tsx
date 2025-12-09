'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import {
  Search,
  Edit2,
  Trash2,
  Plus,
  FolderTree,
  Book,
  Code,
  Palette,
  Music,
  Camera,
  Gamepad2,
  Briefcase,
  Heart,
  Zap,
  Target,
  Lightbulb,
  GraduationCap,
  Laptop,
  Smartphone,
  Globe,
  Users,
  ShoppingBag,
  Car,
  Home,
  Utensils,
  Dumbbell,
  Plane,
  Music2,
  Film,
  Paintbrush,
  Wrench,
  Stethoscope,
  Calculator,
  Microscope,
  Languages,
  History,
  MapPin,
  Sparkles,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  image?: string;
  parent?: {
    _id: string;
    name: string;
    slug: string;
  };
  order: number;
  isActive: boolean;
  courseCount: number;
  createdAt: string;
}

// Icon picker component
const ICONS = [
  { name: 'Book', component: Book },
  { name: 'Code', component: Code },
  { name: 'Palette', component: Palette },
  { name: 'Music', component: Music },
  { name: 'Camera', component: Camera },
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Briefcase', component: Briefcase },
  { name: 'Heart', component: Heart },
  { name: 'Zap', component: Zap },
  { name: 'Target', component: Target },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'GraduationCap', component: GraduationCap },
  { name: 'Laptop', component: Laptop },
  { name: 'Smartphone', component: Smartphone },
  { name: 'Globe', component: Globe },
  { name: 'Users', component: Users },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'Car', component: Car },
  { name: 'Home', component: Home },
  { name: 'Utensils', component: Utensils },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Plane', component: Plane },
  { name: 'Music2', component: Music2 },
  { name: 'Film', component: Film },
  { name: 'Paintbrush', component: Paintbrush },
  { name: 'Wrench', component: Wrench },
  { name: 'Stethoscope', component: Stethoscope },
  { name: 'Calculator', component: Calculator },
  { name: 'Microscope', component: Microscope },
  { name: 'Languages', component: Languages },
  { name: 'History', component: History },
  { name: 'MapPin', component: MapPin },
  { name: 'Sparkles', component: Sparkles },
];

function IconPicker({
  selectedIcon,
  onSelect,
}: {
  selectedIcon: string;
  onSelect: (iconName: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);

  const selectedIconData = ICONS.find((icon) => icon.name === selectedIcon);
  const SelectedIconComponent = selectedIconData?.component || FolderTree;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <SelectedIconComponent className="w-5 h-5 text-gray-600" />
          <span className="text-gray-700">
            {selectedIcon || 'Chọn icon (tùy chọn)'}
          </span>
        </div>
        <span className="text-gray-400">▼</span>
      </button>

      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowPicker(false)}
          ></div>
          <div className="absolute z-20 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto w-full">
            <div className="p-2">
              <button
                type="button"
                onClick={() => {
                  onSelect('');
                  setShowPicker(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 rounded flex items-center space-x-2"
              >
                <FolderTree className="w-4 h-4" />
                <span>Không chọn icon</span>
              </button>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {ICONS.map((icon) => {
                  const IconComponent = icon.component;
                  const isSelected = selectedIcon === icon.name;
                  return (
                    <button
                      key={icon.name}
                      type="button"
                      onClick={() => {
                        onSelect(icon.name);
                        setShowPicker(false);
                      }}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      title={icon.name}
                    >
                      <IconComponent className="w-6 h-6 mx-auto text-gray-700" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function AdminCategoriesContent() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [parentFilter, setParentFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentFilter, activeFilter]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};

      if (parentFilter === 'root') {
        params.parent = 'null';
      } else if (parentFilter !== 'all') {
        params.parent = parentFilter;
      }

      if (activeFilter !== 'all') {
        params.isActive = activeFilter === 'active' ? 'true' : 'false';
      }

      const response = await api.get('/categories', { params });
      if (response.data.success) {
        let filtered = response.data.categories || [];
        
        // Client-side search
        if (searchTerm.trim()) {
          filtered = filtered.filter(
            (cat: Category) =>
              cat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              cat.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (cat.description && cat.description.toLowerCase().includes(searchTerm.toLowerCase()))
          );
        }
        
        setCategories(filtered);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  const handleDelete = async (category: Category) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}"?\n\nHành động này không thể hoàn tác!`)) {
      return;
    }

    try {
      setActionLoading(category._id);
      await api.delete(`/categories/${category._id}`);
      await fetchCategories();
      alert('Xóa danh mục thành công');
    } catch (error) {
      console.error('Failed to delete category:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Có lỗi xảy ra khi xóa danh mục');
      } else {
        alert('Có lỗi xảy ra khi xóa danh mục');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const getRootCategories = () => {
    return categories.filter((cat) => !cat.parent);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý danh mục</h1>
                <p className="text-gray-600 mt-2">Quản lý tất cả danh mục khóa học</p>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo danh mục mới</span>
                </button>
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Quay lại Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo tên, slug hoặc mô tả..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Parent Filter */}
              <div>
                <select
                  value={parentFilter}
                  onChange={(e) => {
                    setParentFilter(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả danh mục</option>
                  <option value="root">Chỉ danh mục gốc</option>
                  {getRootCategories().map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Active Filter */}
              <div>
                <select
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả trạng thái</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Đã vô hiệu hóa</option>
                </select>
              </div>
            </div>
          </div>

          {/* Categories List */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách danh mục ({categories.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p>Không tìm thấy danh mục nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Danh mục
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Danh mục cha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Số khóa học
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thứ tự
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trạng thái
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Thao tác
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            {category.image ? (
                              <Image
                                src={category.image}
                                alt={category.name}
                                width={40}
                                height={40}
                                className="rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                <FolderTree className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{category.name}</div>
                              <div className="text-sm text-gray-500">{category.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.parent ? category.parent.name : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {category.courseCount || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {category.order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {category.isActive ? (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                              Đã vô hiệu hóa
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(category)}
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category)}
                              disabled={actionLoading === category._id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Xóa"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Create Category Modal */}
      {showCreateModal && (
        <CreateCategoryModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchCategories();
          }}
          parentCategories={getRootCategories()}
          allCategories={categories}
        />
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <EditCategoryModal
          category={selectedCategory}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
            fetchCategories();
          }}
          parentCategories={getRootCategories()}
        />
      )}

      <Footer />
    </div>
  );
}

// Create Category Modal
function CreateCategoryModal({
  onClose,
  onSuccess,
  parentCategories,
  allCategories,
}: {
  onClose: () => void;
  onSuccess: () => void;
  parentCategories: Category[];
  allCategories: Category[];
}) {
  // Auto calculate order (max order + 1)
  const getNextOrder = () => {
    if (allCategories.length === 0) return 0;
    const maxOrder = Math.max(...allCategories.map((cat) => cat.order || 0));
    return maxOrder + 1;
  };

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '',
    image: '',
    parent: '',
    order: getNextOrder(),
    isActive: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/uploads/image?folder=edulearn/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setFormData((prev) => ({ ...prev, image: response.data.url }));
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Có lỗi xảy ra khi upload ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        order: Number(formData.order),
        isActive: formData.isActive,
      };

      if (formData.icon.trim()) {
        payload.icon = formData.icon.trim();
      }

      if (formData.image.trim()) {
        payload.image = formData.image.trim();
      }

      if (formData.parent) {
        payload.parent = formData.parent;
      }

      await api.post('/categories', payload);
      alert('Tạo danh mục thành công!');
      onSuccess();
    } catch (err) {
      console.error('Failed to create category:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Có lỗi xảy ra khi tạo danh mục');
      } else {
        setError('Có lỗi xảy ra khi tạo danh mục');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Tạo danh mục mới</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <IconPicker
              selectedIcon={formData.icon}
              onSelect={(iconName) => setFormData((prev) => ({ ...prev, icon: iconName }))}
            />
            <p className="mt-1 text-xs text-gray-500">Chọn icon cho danh mục (tùy chọn)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formData.image && (
              <div className="mt-2">
                <Image src={formData.image} alt="Preview" width={100} height={100} className="rounded-lg" />
              </div>
            )}
            {uploadingImage && <p className="text-sm text-gray-500 mt-1">Đang upload...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục cha</label>
            <select
              name="parent"
              value={formData.parent}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Không có (danh mục gốc)</option>
              {parentCategories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thứ tự</label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang tạo...' : 'Tạo danh mục'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Category Modal
function EditCategoryModal({
  category,
  onClose,
  onSuccess,
  parentCategories,
}: {
  category: Category;
  onClose: () => void;
  onSuccess: () => void;
  parentCategories: Category[];
}) {
  const [formData, setFormData] = useState({
    name: category.name,
    description: category.description || '',
    icon: category.icon || '',
    image: category.image || '',
    parent: category.parent?._id || '',
    order: category.order,
    isActive: category.isActive,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/uploads/image?folder=edulearn/categories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        setFormData((prev) => ({ ...prev, image: response.data.url }));
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Có lỗi xảy ra khi upload ảnh');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      setLoading(true);
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        order: Number(formData.order),
        isActive: formData.isActive,
      };

      if (formData.icon.trim()) {
        payload.icon = formData.icon.trim();
      }

      if (formData.image.trim()) {
        payload.image = formData.image.trim();
      }

      if (formData.parent) {
        payload.parent = formData.parent;
      } else {
        payload.parent = null;
      }

      await api.put(`/categories/${category._id}`, payload);
      alert('Cập nhật danh mục thành công!');
      onSuccess();
    } catch (err) {
      console.error('Failed to update category:', err);
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { data?: { message?: string } } };
        setError(axiosError.response?.data?.message || 'Có lỗi xảy ra khi cập nhật danh mục');
      } else {
        setError('Có lỗi xảy ra khi cập nhật danh mục');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Chỉnh sửa danh mục</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              minLength={2}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mô tả</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              maxLength={500}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
            <IconPicker
              selectedIcon={formData.icon}
              onSelect={(iconName) => setFormData((prev) => ({ ...prev, icon: iconName }))}
            />
            <p className="mt-1 text-xs text-gray-500">Chọn icon cho danh mục (tùy chọn)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hình ảnh</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={uploadingImage}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {formData.image && (
              <div className="mt-2">
                <Image src={formData.image} alt="Preview" width={100} height={100} className="rounded-lg" />
              </div>
            )}
            {uploadingImage && <p className="text-sm text-gray-500 mt-1">Đang upload...</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Danh mục cha</label>
            <select
              name="parent"
              value={formData.parent}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Không có (danh mục gốc)</option>
              {parentCategories
                .filter((cat) => cat._id !== category._id)
                .map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thứ tự</label>
            <input
              type="number"
              name="order"
              value={formData.order}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">Đang hoạt động</span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminCategoriesContent />
    </ProtectedRoute>
  );
}

