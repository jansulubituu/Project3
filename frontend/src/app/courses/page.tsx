'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import CourseCard from '@/components/courses/CourseCard';
import CourseFilters from '@/components/courses/CourseFilters';
import Link from 'next/link';

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface Course {
  _id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnail: string;
  instructor: {
    _id: string;
    fullName: string;
    avatar: string;
    headline?: string;
  };
  category: {
    _id: string;
    name: string;
    slug: string;
  };
  price: number;
  discountPrice?: number;
  level: string;
  averageRating: number;
  totalReviews: number;
  enrollmentCount: number;
  totalDuration?: number;
  totalLessons?: number;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

function CoursesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Filters state
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    level: searchParams.get('level') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    minRating: searchParams.get('minRating') || '',
  });

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Fetch categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        if (response.data.success) {
          setCategories(response.data.categories || []);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (page > 1) params.append('page', page.toString());
      if (search) params.append('search', search);
      if (sort) params.append('sort', sort);
      if (filters.category) params.append('category', filters.category);
      if (filters.level) params.append('level', filters.level);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.minRating) params.append('minRating', filters.minRating);

      const response = await api.get(`/courses?${params.toString()}`);
      if (response.data.success) {
        setCourses(response.data.courses || []);
        setPagination(response.data.pagination || null);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, filters]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.append('page', page.toString());
    if (search) params.append('search', search);
    if (sort) params.append('sort', sort);
    if (filters.category) params.append('category', filters.category);
    if (filters.level) params.append('level', filters.level);
    if (filters.minPrice) params.append('minPrice', filters.minPrice);
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters.minRating) params.append('minRating', filters.minRating);

    router.replace(`/courses?${params.toString()}`, { scroll: false });
  }, [page, search, sort, filters, router]);

  // Fetch courses when dependencies change
  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setFilters({
      category: '',
      level: '',
      minPrice: '',
      maxPrice: '',
      minRating: '',
    });
    setSearch('');
    setSort('newest');
    setPage(1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-gray-900">
                🎓 EduLearn
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link href="/" className="text-gray-700 hover:text-blue-600">
                  Trang chủ
                </Link>
                <Link href="/courses" className="text-blue-600 font-medium">
                  Khóa học
                </Link>
              </nav>
            </div>
            <Link
              href="/login"
              className="text-sm text-gray-700 hover:text-blue-600 font-medium"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tất cả khóa học
          </h1>
          <p className="text-lg text-gray-600">
            Khám phá hàng ngàn khóa học chất lượng cao
          </p>
        </div>

        {/* Search and Sort Bar */}
        <div className="mb-6 space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm kiếm khóa học..."
              className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg
              className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Sort */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700">Sắp xếp:</label>
              <select
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="newest">Mới nhất</option>
                <option value="popular">Phổ biến nhất</option>
                <option value="rating">Đánh giá cao nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </div>
            {pagination && (
              <div className="text-sm text-gray-600">
                Hiển thị {courses.length} / {pagination.totalItems} khóa học
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <CourseFilters
              categories={categories}
              filters={filters}
              onFilterChange={handleFilterChange}
              onReset={handleResetFilters}
            />
          </div>

          {/* Courses Grid */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải khóa học...</p>
              </div>
            ) : courses.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {courses.map((course) => (
                    <CourseCard key={course._id} course={course} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination && pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Trước
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                      .filter((p) => {
                        // Show first, last, current, and pages around current
                        return (
                          p === 1 ||
                          p === pagination.totalPages ||
                          (p >= page - 1 && p <= page + 1)
                        );
                      })
                      .map((p, index, array) => {
                        // Add ellipsis
                        const showEllipsisBefore = index > 0 && array[index - 1] !== p - 1;
                        return (
                          <div key={p} className="flex items-center">
                            {showEllipsisBefore && (
                              <span className="px-2 text-gray-500">...</span>
                            )}
                            <button
                              onClick={() => handlePageChange(p)}
                              className={`px-4 py-2 border rounded-lg transition-colors ${
                                page === p
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}
                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Sau
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <div className="text-4xl mb-4">📚</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Không tìm thấy khóa học
                </h3>
                <p className="text-gray-600 mb-4">
                  Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Xóa bộ lọc
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải...</p>
          </div>
        </div>
      }
    >
      <CoursesPageContent />
    </Suspense>
  );
}

