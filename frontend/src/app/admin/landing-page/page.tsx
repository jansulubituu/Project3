'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface LandingPageConfig {
  _id?: string;
  isActive: boolean;
  hero: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    primaryButtonText: string;
    primaryButtonLink: string;
    secondaryButtonText: string;
    secondaryButtonLink: string;
    showSearchBar: boolean;
  };
  features: {
    title: string;
    subtitle: string;
    items: Array<{
      icon: string;
      title: string;
      description: string;
      gradientFrom: string;
      gradientTo: string;
    }>;
    enabled: boolean;
  };
  categories: {
    title: string;
    subtitle: string;
    limit: number;
    enabled: boolean;
  };
  featuredCourses: {
    title: string;
    subtitle: string;
    limit: number;
    sortBy: 'popular' | 'newest' | 'rating' | 'enrollment';
    enabled: boolean;
  };
  cta: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    enabled: boolean;
  };
  stats: {
    enabled: boolean;
    useAutoStats: boolean;
    customStats?: {
      totalCourses: number;
      totalInstructors: number;
      totalStudents: number;
      averageRating: number;
    };
  };
}

function LandingPageConfigContent() {
  const { user } = useAuth();
  const [config, setConfig] = useState<LandingPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/landing-page/admin');
      if (res.data.success && res.data.configs && res.data.configs.length > 0) {
        const activeConfig = res.data.configs.find((c: LandingPageConfig) => c.isActive) || res.data.configs[0];
        setConfig(activeConfig);
      } else {
        // Create default config
        const defaultConfig: LandingPageConfig = {
          isActive: true,
          hero: {
            title: 'Học tập mọi lúc, mọi nơi',
            subtitle: 'Khám phá hàng ngàn khóa học chất lượng cao từ các giảng viên hàng đầu. Bắt đầu hành trình học tập của bạn ngay hôm nay!',
            searchPlaceholder: 'Tìm kiếm khóa học...',
            primaryButtonText: 'Bắt đầu miễn phí',
            primaryButtonLink: '/register',
            secondaryButtonText: 'Xem khóa học',
            secondaryButtonLink: '/courses',
            showSearchBar: true,
          },
          features: {
            title: 'Tại sao chọn EduLearn?',
            subtitle: 'Nền tảng học trực tuyến hiện đại với đầy đủ tính năng bạn cần',
            items: [],
            enabled: true,
          },
          categories: {
            title: 'Khám phá theo danh mục',
            subtitle: 'Tìm khóa học phù hợp với sở thích và mục tiêu của bạn',
            limit: 6,
            enabled: true,
          },
          featuredCourses: {
            title: 'Khóa học nổi bật',
            subtitle: 'Các khóa học được yêu thích nhất',
            limit: 6,
            sortBy: 'popular',
            enabled: true,
          },
          cta: {
            title: 'Sẵn sàng bắt đầu học tập?',
            subtitle: 'Tham gia cùng hàng ngàn học viên đang học tập trên EduLearn',
            buttonText: 'Đăng ký miễn phí ngay',
            buttonLink: '/register',
            enabled: true,
          },
          stats: {
            enabled: true,
            useAutoStats: true,
          },
        };
        setConfig(defaultConfig);
      }
    } catch (error) {
      console.error('Failed to fetch config:', error);
      setMessage({ type: 'error', text: 'Không thể tải cấu hình' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setMessage(null);

      if (config._id) {
        await api.put(`/landing-page/admin/${config._id}`, config);
      } else {
        await api.post('/landing-page/admin', config);
      }

      setMessage({ type: 'success', text: 'Đã lưu cấu hình thành công!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Không thể lưu cấu hình' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;
    const keys = path.split('.');
    const newConfig = { ...config };
    let current: any = newConfig;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    setConfig(newConfig);
  };

  const addFeature = () => {
    if (!config) return;
    const newFeature = {
      icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
      title: 'Tính năng mới',
      description: 'Mô tả tính năng',
      gradientFrom: 'blue-500',
      gradientTo: 'indigo-600',
    };
    setConfig({
      ...config,
      features: {
        ...config.features,
        items: [...config.features.items, newFeature],
      },
    });
  };

  const removeFeature = (index: number) => {
    if (!config) return;
    setConfig({
      ...config,
      features: {
        ...config.features,
        items: config.features.items.filter((_, i) => i !== index),
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <p className="text-gray-500">Không tìm thấy cấu hình</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href="/admin/dashboard" className="text-blue-600 hover:text-blue-700">
            ← Quay lại Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cấu hình Landing Page</h1>
          <p className="text-gray-600">Tùy chỉnh nội dung hiển thị trên trang chủ</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* Hero Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Hero Section</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={config.hero.title}
                onChange={(e) => updateConfig('hero.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={config.hero.subtitle}
                onChange={(e) => updateConfig('hero.subtitle', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder tìm kiếm</label>
              <input
                type="text"
                value={config.hero.searchPlaceholder}
                onChange={(e) => updateConfig('hero.searchPlaceholder', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút chính - Text</label>
                <input
                  type="text"
                  value={config.hero.primaryButtonText}
                  onChange={(e) => updateConfig('hero.primaryButtonText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút chính - Link</label>
                <input
                  type="text"
                  value={config.hero.primaryButtonLink}
                  onChange={(e) => updateConfig('hero.primaryButtonLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút phụ - Text</label>
                <input
                  type="text"
                  value={config.hero.secondaryButtonText}
                  onChange={(e) => updateConfig('hero.secondaryButtonText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút phụ - Link</label>
                <input
                  type="text"
                  value={config.hero.secondaryButtonLink}
                  onChange={(e) => updateConfig('hero.secondaryButtonLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.hero.showSearchBar}
                onChange={(e) => updateConfig('hero.showSearchBar', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Hiển thị thanh tìm kiếm</label>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Features Section</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.features.enabled}
                onChange={(e) => updateConfig('features.enabled', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Bật section này</label>
            </div>
          </div>
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={config.features.title}
                onChange={(e) => updateConfig('features.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={config.features.subtitle}
                onChange={(e) => updateConfig('features.subtitle', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Danh sách Features</h3>
              <button
                onClick={addFeature}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Thêm Feature
              </button>
            </div>
            {config.features.items.map((feature, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-gray-900">Feature {index + 1}</h4>
                  <button
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Xóa
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Icon (SVG path)</label>
                    <input
                      type="text"
                      value={feature.icon}
                      onChange={(e) => {
                        const newItems = [...config.features.items];
                        newItems[index].icon = e.target.value;
                        updateConfig('features.items', newItems);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tiêu đề</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const newItems = [...config.features.items];
                        newItems[index].title = e.target.value;
                        updateConfig('features.items', newItems);
                      }}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Mô tả</label>
                    <textarea
                      value={feature.description}
                      onChange={(e) => {
                        const newItems = [...config.features.items];
                        newItems[index].description = e.target.value;
                        updateConfig('features.items', newItems);
                      }}
                      rows={2}
                      className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Categories Section</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.categories.enabled}
                onChange={(e) => updateConfig('categories.enabled', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Bật section này</label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={config.categories.title}
                onChange={(e) => updateConfig('categories.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={config.categories.subtitle}
                onChange={(e) => updateConfig('categories.subtitle', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng hiển thị</label>
              <input
                type="number"
                min="1"
                max="20"
                value={config.categories.limit}
                onChange={(e) => updateConfig('categories.limit', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Featured Courses Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Featured Courses Section</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.featuredCourses.enabled}
                onChange={(e) => updateConfig('featuredCourses.enabled', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Bật section này</label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={config.featuredCourses.title}
                onChange={(e) => updateConfig('featuredCourses.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={config.featuredCourses.subtitle}
                onChange={(e) => updateConfig('featuredCourses.subtitle', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={config.featuredCourses.limit}
                  onChange={(e) => updateConfig('featuredCourses.limit', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sắp xếp theo</label>
                <select
                  value={config.featuredCourses.sortBy}
                  onChange={(e) => updateConfig('featuredCourses.sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="popular">Phổ biến</option>
                  <option value="newest">Mới nhất</option>
                  <option value="rating">Đánh giá cao</option>
                  <option value="enrollment">Nhiều học viên</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">CTA Section</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.cta.enabled}
                onChange={(e) => updateConfig('cta.enabled', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Bật section này</label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề</label>
              <input
                type="text"
                value={config.cta.title}
                onChange={(e) => updateConfig('cta.title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
              <textarea
                value={config.cta.subtitle}
                onChange={(e) => updateConfig('cta.subtitle', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút - Text</label>
                <input
                  type="text"
                  value={config.cta.buttonText}
                  onChange={(e) => updateConfig('cta.buttonText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nút - Link</label>
                <input
                  type="text"
                  value={config.cta.buttonLink}
                  onChange={(e) => updateConfig('cta.buttonLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Stats Section</h2>
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.stats.enabled}
                onChange={(e) => updateConfig('stats.enabled', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Bật section này</label>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={config.stats.useAutoStats}
                onChange={(e) => updateConfig('stats.useAutoStats', e.target.checked)}
                className="mr-2"
              />
              <label className="text-sm font-medium text-gray-700">Sử dụng số liệu tự động từ hệ thống</label>
            </div>
            {!config.stats.useAutoStats && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tổng khóa học</label>
                  <input
                    type="number"
                    min="0"
                    value={config.stats.customStats?.totalCourses || 0}
                    onChange={(e) => updateConfig('stats.customStats', {
                      ...config.stats.customStats,
                      totalCourses: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tổng giảng viên</label>
                  <input
                    type="number"
                    min="0"
                    value={config.stats.customStats?.totalInstructors || 0}
                    onChange={(e) => updateConfig('stats.customStats', {
                      ...config.stats.customStats,
                      totalInstructors: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Tổng học viên</label>
                  <input
                    type="number"
                    min="0"
                    value={config.stats.customStats?.totalStudents || 0}
                    onChange={(e) => updateConfig('stats.customStats', {
                      ...config.stats.customStats,
                      totalStudents: parseInt(e.target.value) || 0,
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Đánh giá trung bình</label>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={config.stats.customStats?.averageRating || 0}
                    onChange={(e) => updateConfig('stats.customStats', {
                      ...config.stats.customStats,
                      averageRating: parseFloat(e.target.value) || 0,
                    })}
                    className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
          </button>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function LandingPageConfigPage() {
  return (
    <ProtectedRoute requireAuth={true} allowedRoles={['admin']}>
      <LandingPageConfigContent />
    </ProtectedRoute>
  );
}

