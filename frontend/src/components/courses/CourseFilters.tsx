'use client';

import { useState } from 'react';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface CourseFiltersProps {
  categories: Category[];
  filters: {
    category: string;
    level: string;
    minPrice: string;
    maxPrice: string;
    minRating: string;
  };
  onFilterChange: (filters: {
    category: string;
    level: string;
    minPrice: string;
    maxPrice: string;
    minRating: string;
  }) => void;
  onReset: () => void;
}

export default function CourseFilters({
  categories,
  filters,
  onFilterChange,
  onReset,
}: CourseFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = (key: string, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters =
    filters.category ||
    filters.level ||
    filters.minPrice ||
    filters.maxPrice ||
    filters.minRating;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Bộ lọc</h3>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md text-gray-600 hover:bg-gray-100"
        >
          {isOpen ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          )}
        </button>
      </div>

      {/* Filters Content */}
      <div className={`${isOpen ? 'block' : 'hidden'} md:block space-y-6`}>
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Danh mục</label>
          <select
            value={filters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((category) => (
              <option key={category._id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Cấp độ</label>
          <select
            value={filters.level}
            onChange={(e) => handleChange('level', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả cấp độ</option>
            <option value="beginner">Cơ bản</option>
            <option value="intermediate">Trung bình</option>
            <option value="advanced">Nâng cao</option>
            <option value="all_levels">Mọi cấp độ</option>
          </select>
        </div>

        {/* Price Range */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Giá (VND)</label>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Từ</label>
              <input
                type="number"
                value={filters.minPrice}
                onChange={(e) => handleChange('minPrice', e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Đến</label>
              <input
                type="number"
                value={filters.maxPrice}
                onChange={(e) => handleChange('maxPrice', e.target.value)}
                placeholder="Không giới hạn"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div>
          <label className="block text-sm font-semibold text-gray-900 mb-2">Đánh giá tối thiểu</label>
          <select
            value={filters.minRating}
            onChange={(e) => handleChange('minRating', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">Tất cả</option>
            <option value="4.5">4.5 sao trở lên</option>
            <option value="4.0">4.0 sao trở lên</option>
            <option value="3.5">3.5 sao trở lên</option>
            <option value="3.0">3.0 sao trở lên</option>
          </select>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>
    </div>
  );
}

