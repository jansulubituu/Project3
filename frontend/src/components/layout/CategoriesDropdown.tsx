'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import Dropdown from '@/components/ui/Dropdown';

interface Category {
  _id: string;
  name: string;
  slug: string;
  icon?: string;
  courseCount: number;
}

interface CategoriesDropdownProps {
  className?: string;
}

export default function CategoriesDropdown({ className = '' }: CategoriesDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/categories?limit=12');
      if (res.data.success) {
        setCategories(res.data.categories || []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetchCategories();
    }
  }, [isOpen, categories.length, fetchCategories]);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className="text-sm lg:text-base text-gray-700 hover:text-blue-600 transition-colors flex items-center space-x-1"
      >
        <span>Danh mục</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Dropdown isOpen={isOpen} onClose={() => setIsOpen(false)} align="left" className="w-64">
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Đang tải...</div>
          ) : categories.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">Không có danh mục</div>
          ) : (
            <>
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Danh mục khóa học</h3>
              </div>
              <div className="grid grid-cols-2 gap-1 p-2">
                {categories.map((category) => (
                  <Link
                    key={category._id}
                    href={`/courses?category=${category.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="px-3 py-2 rounded-md hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center space-x-2">
                      {category.icon && (
                        <span className="text-lg group-hover:scale-110 transition-transform">{category.icon}</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{category.name}</div>
                        <div className="text-xs text-gray-500">{category.courseCount} khóa học</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-200">
                <Link
                  href="/courses"
                  onClick={() => setIsOpen(false)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Xem tất cả khóa học →
                </Link>
              </div>
            </>
          )}
        </div>
      </Dropdown>
    </div>
  );
}
