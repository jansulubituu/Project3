'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CourseCard from '@/components/courses/CourseCard';

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  courseCount: number;
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
  publishedLessonCount?: number;
}

interface PlatformStats {
  totalCourses: number;
  totalInstructors: number;
  totalStudents: number;
  averageRating: number;
}

interface LandingPageFeature {
  icon: string;
  title: string;
  description: string;
  gradientFrom: string;
  gradientTo: string;
}

interface LandingPageConfig {
  hero?: {
    title?: string;
    subtitle?: string;
    searchPlaceholder?: string;
    primaryButtonText?: string;
    primaryButtonLink?: string;
    secondaryButtonText?: string;
    secondaryButtonLink?: string;
    showSearchBar?: boolean;
  };
  features?: {
    title?: string;
    subtitle?: string;
    items?: LandingPageFeature[];
    enabled?: boolean;
  };
  categories?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    enabled?: boolean;
  };
  featuredCourses?: {
    title?: string;
    subtitle?: string;
    limit?: number;
    sortBy?: 'popular' | 'newest' | 'rating' | 'enrollment';
    enabled?: boolean;
  };
  cta?: {
    title?: string;
    subtitle?: string;
    buttonText?: string;
    buttonLink?: string;
    enabled?: boolean;
  };
  stats?: {
    enabled?: boolean;
    useAutoStats?: boolean;
    customStats?: {
      totalCourses: number;
      totalInstructors: number;
      totalStudents: number;
      averageRating: number;
    };
  };
}

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<PlatformStats>({
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
    averageRating: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const coursesRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);
  const [animatedStats, setAnimatedStats] = useState<PlatformStats>({
    totalCourses: 0,
    totalInstructors: 0,
    totalStudents: 0,
    averageRating: 0,
  });
  const [revealedSections, setRevealedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const animateStats = useCallback(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const stepDuration = duration / steps;
    const timers: NodeJS.Timeout[] = [];

    Object.keys(stats).forEach((key) => {
      const target = stats[key as keyof PlatformStats];
      let current = 0;
      const increment = target / steps;

      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        setAnimatedStats((prev) => ({
          ...prev,
          [key]: key === 'averageRating' ? Number(current.toFixed(1)) : Math.floor(current),
        }));
      }, stepDuration);
      
      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearInterval(timer));
    };
  }, [stats]);

  // Intersection Observer for scroll reveal animations
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    const sections = [
      { ref: statsRef, id: 'stats' },
      { ref: featuresRef, id: 'features' },
      { ref: categoriesRef, id: 'categories' },
      { ref: coursesRef, id: 'courses' },
      { ref: ctaRef, id: 'cta' },
    ];

    sections.forEach(({ ref, id }) => {
      const currentRef = ref.current;
      if (!currentRef) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setRevealedSections((prev) => new Set(prev).add(id));
              
              // Special handling for stats section
              if (id === 'stats' && !statsVisible) {
                setStatsVisible(true);
                animateStats();
              }
            }
          });
        },
        { threshold: 0.2, rootMargin: '0px 0px -100px 0px' }
      );

      observer.observe(currentRef);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [statsVisible, animateStats]);

  const [landingConfig, setLandingConfig] = useState<LandingPageConfig | null>(null);

  const fetchData = async () => {
    try {
      // Fetch landing page config
      let configData = null;
      try {
        const configRes = await api.get('/landing-page');
        if (configRes.data.success) {
          configData = configRes.data.config;
          setLandingConfig(configData);
        }
      } catch (error) {
        console.warn('Failed to fetch landing page config, using defaults:', error);
      }

      // Fetch categories
      const limit = configData?.categories?.limit || 6;
      if (configData?.categories?.enabled !== false) {
        const categoriesRes = await api.get(`/categories?limit=${limit}`);
        if (categoriesRes.data.success) {
          setCategories(categoriesRes.data.categories || []);
        }
      }

      // Fetch featured courses
      if (configData?.featuredCourses?.enabled !== false) {
        const courseLimit = configData?.featuredCourses?.limit || 6;
        const sortBy = configData?.featuredCourses?.sortBy || 'popular';
        const coursesRes = await api.get(`/courses?limit=${courseLimit}&sort=${sortBy}`);
        if (coursesRes.data.success) {
          setFeaturedCourses(coursesRes.data.courses || []);
        }
      }

      // Fetch platform stats
      if (configData?.stats?.enabled !== false) {
        if (configData?.stats?.useAutoStats !== false) {
          const statsRes = await api.get('/courses/stats');
          if (statsRes.data.success) {
            setStats(statsRes.data.stats);
            setAnimatedStats(statsRes.data.stats);
          }
        } else if (configData?.stats?.customStats) {
          setStats(configData.stats.customStats);
          setAnimatedStats(configData.stats.customStats);
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/courses?search=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K+`;
    }
    return num.toString();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Enhanced with Advanced Animations */}
        <section className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden animate-gradient">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-float"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-300 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse-glow"></div>
          </div>

          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              animation: 'gradient-shift 20s linear infinite'
            }}></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 lg:py-32">
            <div className="text-center animate-fade-in-up">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 px-2 leading-tight">
                {landingConfig?.hero?.title || 'Học tập mọi lúc, mọi nơi'}
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-blue-100 mb-8 sm:mb-10 max-w-3xl mx-auto px-4 leading-relaxed">
                {landingConfig?.hero?.subtitle || 'Khám phá hàng ngàn khóa học chất lượng cao từ các giảng viên hàng đầu. Bắt đầu hành trình học tập của bạn ngay hôm nay!'}
              </p>

              {/* Search Bar - Enhanced */}
              {landingConfig?.hero?.showSearchBar !== false && (
                <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8 sm:mb-10 px-4 animate-scale-in" style={{ animationDelay: '0.3s' }}>
                  <div className="flex flex-col sm:flex-row gap-3 glass rounded-2xl p-2 shadow-2xl hover:shadow-white/20 transition-all duration-300">
                    <div className="flex-1 relative">
                      <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={landingConfig?.hero?.searchPlaceholder || 'Tìm kiếm khóa học...'}
                        className="w-full pl-12 pr-4 py-3 sm:py-4 rounded-xl bg-white/95 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all text-sm sm:text-base shadow-lg"
                      />
                    </div>
                    <button
                      type="submit"
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-sm sm:text-base hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:scale-105 whitespace-nowrap transform"
                    >
                      Tìm kiếm
                    </button>
                  </div>
                </form>
              )}

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/courses"
                      className="px-8 sm:px-10 py-4 sm:py-5 bg-white text-blue-600 rounded-xl font-bold text-base sm:text-lg hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-white/20 hover:scale-105 text-center"
                    >
                      Khám phá khóa học
                    </Link>
                    <Link
                      href="/dashboard"
                      className="px-8 sm:px-10 py-4 sm:py-5 bg-blue-500/90 backdrop-blur-sm text-white rounded-xl font-bold text-base sm:text-lg hover:bg-blue-400 transition-all duration-300 border-2 border-white/50 shadow-xl hover:scale-105 text-center"
                    >
                      Vào Dashboard
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href={landingConfig?.hero?.primaryButtonLink || '/register'}
                      className="px-8 sm:px-10 py-4 sm:py-5 bg-white text-blue-600 rounded-xl font-bold text-base sm:text-lg hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-white/20 hover:scale-105 text-center"
                    >
                      {landingConfig?.hero?.primaryButtonText || 'Bắt đầu miễn phí'}
                    </Link>
                    <Link
                      href={landingConfig?.hero?.secondaryButtonLink || '/courses'}
                      className="px-8 sm:px-10 py-4 sm:py-5 bg-blue-500/90 backdrop-blur-sm text-white rounded-xl font-bold text-base sm:text-lg hover:bg-blue-400 transition-all duration-300 border-2 border-white/50 shadow-xl hover:scale-105 text-center"
                    >
                      {landingConfig?.hero?.secondaryButtonText || 'Xem khóa học'}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Section Connector - Hero to Stats */}
        <div className="section-connector relative h-24 -mt-12" style={{ background: 'linear-gradient(to bottom, rgba(59, 130, 246, 0.1), transparent)' }}>
          <div className="connection-line text-blue-600"></div>
          <div className="connection-dot bg-blue-600" style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' }}></div>
        </div>

        {/* Stats Section - Dynamic with Icons - Enhanced */}
        {landingConfig?.stats?.enabled !== false && (
        <section 
          ref={statsRef} 
          className={`relative bg-gradient-to-b from-gray-50 via-white to-gray-50 py-16 sm:py-20 lg:py-24 overflow-hidden scroll-reveal ${revealedSections.has('stats') ? 'revealed' : ''}`}
        >
          {/* Decorative Background */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-0 left-0 w-full h-full" style={{
              backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
              backgroundSize: '40px 40px'
            }}></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {/* Total Courses */}
              <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 text-center border-2 border-transparent hover:border-blue-200 relative overflow-hidden">
                {/* Animated Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    {statsVisible ? formatNumber(animatedStats.totalCourses) : '0'}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-semibold uppercase tracking-wide">Khóa học</div>
                </div>
              </div>

              {/* Total Instructors */}
              <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 text-center border-2 border-transparent hover:border-purple-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                    {statsVisible ? formatNumber(animatedStats.totalInstructors) : '0'}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-semibold uppercase tracking-wide">Giảng viên</div>
                </div>
              </div>

              {/* Total Students */}
              <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 text-center border-2 border-transparent hover:border-green-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-50 to-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
                    {statsVisible ? formatNumber(animatedStats.totalStudents) : '0'}
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-semibold uppercase tracking-wide">Học viên</div>
                </div>
              </div>

              {/* Average Rating */}
              <div className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 text-center border-2 border-transparent hover:border-yellow-200 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-50 to-orange-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl mb-4 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  </div>
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-extrabold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-2">
                    {statsVisible ? animatedStats.averageRating.toFixed(1) : '0.0'}
                    <span className="text-3xl">★</span>
                  </div>
                  <div className="text-sm sm:text-base text-gray-600 font-semibold uppercase tracking-wide">Đánh giá trung bình</div>
                </div>
              </div>
            </div>
          </div>
        </section>
        )}

        {/* Section Connector - Stats to Features */}
        <div className="wave-connector relative h-20 -mt-10">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C300,60 600,60 900,30 C1050,15 1125,15 1200,0 L1200,120 L0,120 Z" fill="currentColor" className="text-white"></path>
          </svg>
          <div className="connection-dot bg-purple-600" style={{ boxShadow: '0 0 20px rgba(147, 51, 234, 0.6)' }}></div>
        </div>

        {/* Features Section - Professional Icons - Enhanced */}
        {landingConfig?.features?.enabled !== false && (
        <section 
          id="features" 
          ref={featuresRef}
          className={`relative py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden scroll-reveal ${revealedSections.has('features') ? 'revealed' : ''}`}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '2s' }}></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20 lg:mb-24 animate-fade-in-up">
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-6">
                Tính năng nổi bật
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 sm:mb-8">
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {landingConfig?.features?.title || 'Tại sao chọn EduLearn?'}
                </span>
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {landingConfig?.features?.subtitle || 'Nền tảng học trực tuyến hiện đại với đầy đủ tính năng bạn cần'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
              {landingConfig?.features?.items && landingConfig.features.items.length > 0 ? (
                landingConfig.features.items.map((feature: LandingPageFeature, index: number) => {
                  const isRevealed = revealedSections.has('features');
                  // Map gradient colors to Tailwind classes - using inline styles for dynamic colors
                  const getGradientStyle = (from: string, to: string) => {
                    // Convert Tailwind color names to actual colors
                    const colorMap: Record<string, string> = {
                      'blue-50': '#eff6ff',
                      'indigo-50': '#eef2ff',
                      'purple-50': '#faf5ff',
                      'pink-50': '#fdf2f8',
                      'green-50': '#f0fdf4',
                      'emerald-50': '#ecfdf5',
                      'yellow-50': '#fefce8',
                      'orange-50': '#fff7ed',
                      'red-50': '#fef2f2',
                      'rose-50': '#fff1f2',
                    };
                    const borderMap: Record<string, string> = {
                      'blue': '#dbeafe',
                      'purple': '#f3e8ff',
                      'green': '#dcfce7',
                      'yellow': '#fef9c3',
                      'indigo': '#e0e7ff',
                      'red': '#fee2e2',
                    };
                    const fromColor = colorMap[from] || '#eff6ff';
                    const toColor = colorMap[to] || '#eef2ff';
                    const borderColor = borderMap[from.split('-')[0]] || '#dbeafe';
                    return {
                      background: `linear-gradient(to bottom right, ${fromColor}, ${toColor})`,
                      borderColor: borderColor,
                    };
                  };

                  const getIconGradientStyle = (from: string, to: string) => {
                    const colorMap: Record<string, string> = {
                      'blue-500': '#3b82f6',
                      'indigo-600': '#4f46e5',
                      'purple-500': '#a855f7',
                      'pink-600': '#db2777',
                      'green-500': '#22c55e',
                      'emerald-600': '#059669',
                      'yellow-500': '#eab308',
                      'orange-600': '#ea580c',
                      'red-500': '#ef4444',
                      'rose-600': '#e11d48',
                    };
                    const fromColor = colorMap[from] || '#3b82f6';
                    const toColor = colorMap[to] || '#4f46e5';
                    return {
                      background: `linear-gradient(to bottom right, ${fromColor}, ${toColor})`,
                    };
                  };

                  return (
                    <div
                      key={index}
                      className={`group relative rounded-3xl p-8 sm:p-10 hover:shadow-2xl transition-all duration-500 hover:scale-105 hover:-translate-y-2 border-2 border-transparent hover:border-opacity-50 overflow-hidden scroll-reveal ${isRevealed ? 'revealed' : ''}`}
                      style={{
                        ...getGradientStyle(feature.gradientFrom, feature.gradientTo),
                        transitionDelay: isRevealed ? `${index * 0.1}s` : '0s'
                      }}
                    >
                      {/* Animated Background Pattern */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,0,0,0.1) 1px, transparent 0)',
                        backgroundSize: '30px 30px'
                      }}></div>
                      
                      <div className="relative z-10">
                        <div
                          className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl"
                          style={getIconGradientStyle(feature.gradientFrom, feature.gradientTo)}
                        >
                          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                          </svg>
                        </div>
                        <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                          {feature.title}
                        </h3>
                        <p className="text-gray-600 leading-relaxed text-base sm:text-lg">
                          {feature.description}
                        </p>
                      </div>
                      
                      {/* Hover Effect Border */}
                      <div className="absolute inset-0 rounded-3xl border-2 border-transparent group-hover:border-white/30 transition-all duration-500 pointer-events-none"></div>
                    </div>
                  );
                })
              ) : (
                // Default features if no config
                <>
                  <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 hover:scale-105 border border-blue-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl mb-6 group-hover:scale-110 transition-transform">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">Khóa học đa dạng</h3>
                    <p className="text-gray-600 leading-relaxed">Hàng ngàn khóa học từ lập trình, thiết kế, marketing đến phát triển kỹ năng mềm</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
        )}

        {/* Section Connector - Features to Categories */}
        <div className="section-connector relative h-16 -mt-8" style={{ background: 'linear-gradient(to bottom, rgba(219, 39, 119, 0.1), transparent)' }}>
          <div className="connection-line text-pink-600"></div>
          <div className="connection-dot bg-pink-600" style={{ boxShadow: '0 0 20px rgba(219, 39, 119, 0.6)' }}></div>
        </div>

        {/* Categories Section - Enhanced with Advanced Effects */}
        {landingConfig?.categories?.enabled !== false && (
        <section 
          id="categories" 
          ref={categoriesRef}
          className={`relative py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-gray-50 via-white to-gray-50 overflow-hidden scroll-reveal ${revealedSections.has('categories') ? 'revealed' : ''}`}
        >
          {/* Animated Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(45deg, transparent 30%, rgba(0,0,0,0.05) 50%, transparent 70%), linear-gradient(-45deg, transparent 30%, rgba(0,0,0,0.05) 50%, transparent 70%)',
              backgroundSize: '60px 60px'
            }}></div>
          </div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20 lg:mb-24 animate-fade-in-up">
              <div className="inline-block px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold mb-6">
                Danh mục phổ biến
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 sm:mb-8">
                <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent">
                  {landingConfig?.categories?.title || 'Khám phá theo danh mục'}
                </span>
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {landingConfig?.categories?.subtitle || 'Tìm khóa học phù hợp với sở thích và mục tiêu của bạn'}
              </p>
            </div>
            {loading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 sm:gap-6">
                {categories.map((category, index) => {
                  const isRevealed = revealedSections.has('categories');
                  return (
                  <Link
                    key={category._id}
                    href={`/categories/${category.slug}`}
                    className={`group relative bg-white rounded-2xl shadow-lg p-6 sm:p-8 text-center hover:shadow-2xl transition-all duration-500 hover:scale-110 hover:-translate-y-2 border-2 border-transparent hover:border-purple-200 overflow-hidden scroll-reveal ${isRevealed ? 'revealed' : ''}`}
                    style={{ transitionDelay: isRevealed ? `${index * 50}ms` : '0s' }}
                  >
                    {/* Animated Background on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-pink-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    
                    <div className="relative z-10">
                      <div className="text-5xl sm:text-6xl mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 inline-block">
                        {category.icon || '📁'}
                      </div>
                      <h3 className="text-base sm:text-lg font-extrabold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm sm:text-base text-gray-500 font-semibold">
                        {category.courseCount} khóa học
                      </p>
                    </div>
                    
                    {/* Shine Effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16 text-gray-500 text-base sm:text-lg">
                Chưa có danh mục nào
              </div>
            )}
          </div>
        </section>
        )}

        {/* Section Connector - Categories to Courses */}
        <div className="wave-connector relative h-16 -mt-8">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none" style={{ transform: 'rotate(180deg)' }}>
            <path d="M0,0 C300,60 600,60 900,30 C1050,15 1125,15 1200,0 L1200,120 L0,120 Z" fill="currentColor" className="text-gray-50"></path>
          </svg>
          <div className="connection-dot bg-blue-600" style={{ boxShadow: '0 0 20px rgba(59, 130, 246, 0.6)' }}></div>
        </div>

        {/* Featured Courses Section - Enhanced */}
        {landingConfig?.featuredCourses?.enabled !== false && (
        <section 
          id="courses" 
          ref={coursesRef}
          className={`relative py-20 sm:py-24 lg:py-32 bg-gradient-to-b from-white via-blue-50/30 to-white overflow-hidden scroll-reveal ${revealedSections.has('courses') ? 'revealed' : ''}`}
        >
          {/* Decorative Elements */}
          <div className="absolute top-20 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float"></div>
          <div className="absolute bottom-20 left-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" style={{ animationDelay: '1.5s' }}></div>
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 sm:mb-20 lg:mb-24 animate-fade-in-up">
              <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-6">
                Khóa học được yêu thích
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 sm:mb-8">
                <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {landingConfig?.featuredCourses?.title || 'Khóa học nổi bật'}
                </span>
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                {landingConfig?.featuredCourses?.subtitle || 'Các khóa học được yêu thích nhất'}
              </p>
            </div>
            {loading ? (
              <div className="text-center py-12 sm:py-16">
                <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : featuredCourses.length > 0 ? (
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 scroll-reveal ${revealedSections.has('courses') ? 'revealed' : ''}`}>
                {featuredCourses.map((course, index) => (
                  <div 
                    key={course._id}
                    className="scroll-reveal"
                    style={{ 
                      transitionDelay: revealedSections.has('courses') ? `${index * 0.1}s` : '0s',
                      opacity: revealedSections.has('courses') ? 1 : 0,
                      transform: revealedSections.has('courses') ? 'translateY(0)' : 'translateY(30px)'
                    }}
                  >
                    <CourseCard course={course} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 sm:py-16 text-gray-500 text-base sm:text-lg">
                Chưa có khóa học nào
              </div>
            )}
            <div className="text-center mt-16 sm:mt-20">
              <Link
                href="/courses"
                className="group inline-flex items-center gap-3 px-10 sm:px-12 py-5 sm:py-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl font-bold text-lg sm:text-xl hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 transition-all duration-500 shadow-2xl hover:shadow-blue-500/50 hover:scale-110 transform"
              >
                <span>Xem tất cả khóa học</span>
                <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
        )}

        {/* Section Connector - Courses to CTA */}
        <div className="wave-connector relative h-20 -mt-10">
          <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0 C300,60 600,60 900,30 C1050,15 1125,15 1200,0 L1200,120 L0,120 Z" fill="currentColor" className="text-white"></path>
          </svg>
          <div className="connection-dot bg-indigo-600" style={{ boxShadow: '0 0 20px rgba(99, 102, 241, 0.6)' }}></div>
        </div>

        {/* CTA Section - Enhanced with Advanced Effects */}
        {landingConfig?.cta?.enabled !== false && (
        <section 
          ref={ctaRef}
          className={`relative py-20 sm:py-24 lg:py-32 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white overflow-hidden animate-gradient scroll-reveal ${revealedSections.has('cta') ? 'revealed' : ''}`}
        >
          {/* Animated Background Elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-purple-300 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse-glow"></div>
          </div>

          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              animation: 'gradient-shift 15s linear infinite'
            }}></div>
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-scale-in">
              <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-semibold mb-6">
                Bắt đầu ngay hôm nay
              </div>
              <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 sm:mb-8 leading-tight">
                {landingConfig?.cta?.title || 'Sẵn sàng bắt đầu học tập?'}
              </h2>
              <p className="text-xl sm:text-2xl lg:text-3xl text-blue-100 mb-10 sm:mb-12 max-w-2xl mx-auto leading-relaxed">
                {landingConfig?.cta?.subtitle || 'Tham gia cùng hàng ngàn học viên đang học tập trên EduLearn'}
              </p>
              {!isAuthenticated && (
                <Link
                  href={landingConfig?.cta?.buttonLink || '/register'}
                  className="group inline-flex items-center gap-3 px-12 sm:px-16 py-6 sm:py-7 bg-white text-blue-600 rounded-2xl font-bold text-xl sm:text-2xl hover:bg-blue-50 transition-all duration-500 shadow-2xl hover:shadow-white/30 hover:scale-110 transform relative overflow-hidden"
                >
                  <span className="relative z-10">{landingConfig?.cta?.buttonText || 'Đăng ký miễn phí ngay'}</span>
                  <svg className="w-7 h-7 group-hover:translate-x-2 transition-transform duration-300 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  {/* Shine Effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
                </Link>
              )}
            </div>
          </div>
        </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
