'use client';

import { Search, Filter, X } from 'lucide-react';

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterType: 'all' | 'section' | 'lesson' | 'exam';
  onFilterTypeChange: (type: 'all' | 'section' | 'lesson' | 'exam') => void;
  filterStatus: string;
  onFilterStatusChange: (status: string) => void;
  showStatusFilter?: boolean;
}

export default function SearchFilterBar({
  searchQuery,
  onSearchChange,
  filterType,
  onFilterTypeChange,
  filterStatus,
  onFilterStatusChange,
  showStatusFilter = true,
}: SearchFilterBarProps) {
  const hasActiveFilters = searchQuery.trim() !== '' || filterType !== 'all' || filterStatus !== 'all';

  const handleClearFilters = () => {
    onSearchChange('');
    onFilterTypeChange('all');
    onFilterStatusChange('all');
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search Input */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm kiếm sections, lessons, exams..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter by Type */}
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value as 'all' | 'section' | 'lesson' | 'exam')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">Tất cả loại</option>
            <option value="section">Sections</option>
            <option value="lesson">Lessons</option>
            <option value="exam">Exams</option>
          </select>
        </div>

        {/* Filter by Status */}
        {showStatusFilter && (
          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => onFilterStatusChange(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="published">Đã xuất bản</option>
              <option value="draft">Bản nháp</option>
              <option value="archived">Đã lưu trữ</option>
            </select>
          </div>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            <X className="w-4 h-4" />
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-3 flex flex-wrap gap-2">
          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
              Tìm kiếm: "{searchQuery}"
              <button
                onClick={() => onSearchChange('')}
                className="hover:text-blue-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterType !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
              Loại: {filterType === 'section' ? 'Sections' : filterType === 'lesson' ? 'Lessons' : 'Exams'}
              <button
                onClick={() => onFilterTypeChange('all')}
                className="hover:text-purple-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
              Trạng thái: {filterStatus === 'published' ? 'Đã xuất bản' : filterStatus === 'draft' ? 'Bản nháp' : 'Đã lưu trữ'}
              <button
                onClick={() => onFilterStatusChange('all')}
                className="hover:text-green-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
