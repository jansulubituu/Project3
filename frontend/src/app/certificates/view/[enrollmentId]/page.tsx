'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

interface CertificateData {
  url: string;
  certificateId: string;
  issuedAt: string;
  completionSnapshot?: {
    totalLessons: number;
    completedLessons: number;
    snapshotDate: string;
  };
  currentProgress: {
    totalLessons: number;
    completedLessons: number;
    progress: number;
  };
  hasNewContent: boolean;
  course?: {
    title: string;
    slug: string;
  };
  student?: {
    fullName: string;
    email: string;
  };
}

export default function CertificateViewPage() {
  return (
    <ProtectedRoute>
      <CertificateViewContent />
    </ProtectedRoute>
  );
}

function CertificateViewContent() {
  const params = useParams();
  const router = useRouter();
  const enrollmentId = params.enrollmentId as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (enrollmentId) {
      loadCertificate();
    }
  }, [enrollmentId]);

  const loadCertificate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/certificates/enrollment/${enrollmentId}`);
      if (res.data.success && res.data.certificate) {
        setCertificate(res.data.certificate);
      } else {
        setError(res.data.message || 'Không tìm thấy chứng chỉ');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải chứng chỉ');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Đang tải chứng chỉ...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !certificate) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-red-500 text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy chứng chỉ</h1>
            <p className="text-gray-600 mb-6">{error || 'Chứng chỉ chưa được cấp hoặc không tồn tại'}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/my-learning"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Quay về Học tập của tôi
              </Link>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Quay lại
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="no-print">
          <Header />
        </div>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Header */}
        <div className="mb-6 no-print">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Chứng chỉ của tôi</h1>
              {certificate?.course && (
                <p className="text-base sm:text-lg text-gray-600 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {certificate.course.title}
                </p>
              )}
            </div>
            <Link
              href="/my-learning"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Quay lại
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Certificate Display */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              {/* Certificate Display */}
              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6 md:p-8 certificate-print mb-4">
                <div className="bg-white rounded-xl shadow-2xl border-8 border-blue-600 p-6 sm:p-10 md:p-14 lg:p-16 flex flex-col relative max-w-5xl mx-auto w-full min-h-[650px]">
                  {/* Decorative Corner Ornaments - moved further from edges */}
                  <div className="absolute top-4 left-4 w-12 h-12 border-[3px] border-blue-400 rounded-full opacity-20 pointer-events-none"></div>
                  <div className="absolute top-4 right-4 w-12 h-12 border-[3px] border-blue-400 rounded-full opacity-20 pointer-events-none"></div>
                  <div className="absolute bottom-4 left-4 w-12 h-12 border-[3px] border-blue-400 rounded-full opacity-20 pointer-events-none"></div>
                  <div className="absolute bottom-4 right-4 w-12 h-12 border-[3px] border-blue-400 rounded-full opacity-20 pointer-events-none"></div>
                  
                  {/* Inner Decorative Border - adjusted inset */}
                  <div className="absolute inset-4 border-2 border-blue-200 rounded-lg pointer-events-none"></div>
                  
                  {/* Top Decorative Pattern - adjusted position */}
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent pointer-events-none"></div>
                  
                  {/* Content Container with proper spacing */}
                  <div className="flex flex-col justify-between relative z-10 pt-6 sm:pt-8 pb-28 sm:pb-32 flex-1">
                    {/* Top Section */}
                    <div className="flex-shrink-0">
                      {/* Header with Logo Area */}
                      <div className="text-center mb-3 sm:mb-4">
                        <div className="inline-block mb-2 sm:mb-3">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-3xl sm:text-4xl font-bold text-white">🎓</span>
                          </div>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-1 sm:mb-2 tracking-wide">
                          EduLearn
                        </h2>
                        <p className="text-xs sm:text-sm md:text-base text-gray-500 font-medium">Online Learning Platform</p>
                      </div>

                      {/* Main Title with Decorative Elements */}
                      <div className="text-center mb-3 sm:mb-4">
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-transparent to-blue-400"></div>
                          <div className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full"></div>
                          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-l from-transparent to-blue-400"></div>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-blue-600 mb-1 sm:mb-2 tracking-wider">
                          CERTIFICATE
                        </h1>
                        <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-indigo-500 tracking-wide">
                          OF COMPLETION
                        </h2>
                        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-2 sm:mt-3">
                          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-r from-transparent to-blue-400"></div>
                          <div className="w-2 sm:w-3 h-2 sm:h-3 bg-blue-500 rounded-full"></div>
                          <div className="w-8 sm:w-12 h-0.5 bg-gradient-to-l from-transparent to-blue-400"></div>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section - Main Content */}
                    <div className="text-center flex flex-col justify-center max-w-3xl mx-auto px-4 my-4 sm:my-6 flex-1">
                      <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-2 sm:mb-3 md:mb-4 italic font-serif">
                        This is to certify that
                      </p>
                      <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 sm:mb-3 md:mb-4 break-words leading-tight px-2">
                        {certificate.student?.fullName || 'Student Name'}
                      </h3>
                      <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-2 sm:mb-3 md:mb-4 font-serif">
                        has successfully completed the course
                      </p>
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3 sm:p-4 mb-2 sm:mb-3 md:mb-4 border-l-4 border-blue-500">
                        <h4 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-blue-600 break-words leading-tight">
                          {certificate.course?.title || 'Course Title'}
                        </h4>
                      </div>

                      {/* Completion Stats */}
                      {certificate.completionSnapshot && (
                        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm md:text-base text-gray-600 mb-2 sm:mb-3">
                          <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Completed {certificate.completionSnapshot.completedLessons} of {certificate.completionSnapshot.totalLessons} lessons
                          </span>
                        </div>
                      )}

                      {/* Completion Date */}
                      <div className="text-center">
                        <p className="text-xs sm:text-sm md:text-base text-gray-600 font-medium">
                          <span className="text-gray-500">Completion Date:</span>{' '}
                          <span className="text-blue-600 font-semibold">
                            {new Date(certificate.issuedAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Bottom Section - Signatures */}
                    <div className="mt-4 sm:mt-6 pt-4 sm:pt-6">
                      <div className="flex justify-between w-full px-4 sm:px-8 mb-6 sm:mb-8">
                        <div className="flex-1 text-center">
                          <div className="border-t-2 border-gray-300 w-32 sm:w-40 md:w-48 mx-auto pt-2 sm:pt-3">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700">Instructor</p>
                            <p className="text-xs text-gray-500 mt-1">Signature</p>
                          </div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="border-t-2 border-gray-300 w-32 sm:w-40 md:w-48 mx-auto pt-2 sm:pt-3">
                            <p className="text-xs sm:text-sm font-semibold text-gray-700">EduLearn Platform</p>
                            <p className="text-xs text-gray-500 mt-1">Official Seal</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Certificate ID and Verification - Fixed at bottom with proper spacing */}
                  <div className="absolute bottom-3 sm:bottom-4 left-4 sm:left-6 right-4 sm:right-6 text-center z-20">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-2.5 border border-gray-200 shadow-sm max-w-full">
                      <p className="text-xs text-gray-500 mb-1">
                        Certificate ID: <span className="font-mono text-gray-700 break-all">{certificate.certificateId}</span>
                      </p>
                      <p className="text-xs text-gray-400 break-all px-1">
                        Verify at:{' '}
                        {typeof window !== 'undefined' 
                          ? `${window.location.origin}/certificates/verify/${certificate.certificateId}`
                          : `/certificates/verify/${certificate.certificateId}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 sm:p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50 no-print mt-4">
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  {certificate.url && (
                    <>
                      <a
                        href={certificate.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Xem PDF
                      </a>
                      <a
                        href={certificate.url}
                        download
                        className="px-4 py-2 border border-blue-600 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium flex items-center"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Tải xuống PDF
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    In chứng chỉ
                  </button>
                  <Link
                    href={`/certificates/verify/${certificate.certificateId}`}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Xác minh chứng chỉ
                  </Link>
                  <button
                    onClick={() => {
                      if (navigator.share) {
                        navigator.share({
                          title: `Chứng chỉ ${certificate?.course?.title || ''}`,
                          text: `Tôi đã hoàn thành khóa học ${certificate?.course?.title || ''} trên EduLearn!`,
                          url: `${window.location.origin}/certificates/verify/${certificate.certificateId}`,
                        });
                      } else {
                        // Fallback: Copy link to clipboard
                        navigator.clipboard.writeText(
                          `${window.location.origin}/certificates/verify/${certificate.certificateId}`
                        );
                        alert('Đã sao chép link xác minh vào clipboard!');
                      }
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Chia sẻ
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Certificate Info */}
          <div className="space-y-6 no-print order-1 lg:order-2">
            {/* Certificate Details */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-200">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-xl font-bold text-gray-900">Thông tin chứng chỉ</h2>
              </div>
              <div className="space-y-5">
                {certificate?.student && (
                  <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Học viên</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{certificate.student.fullName}</p>
                    <p className="text-sm text-gray-500 mt-1">{certificate.student.email}</p>
                  </div>
                )}
                {certificate?.course && (
                  <div className="bg-indigo-50 rounded-lg p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Khóa học</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900 mb-2">{certificate.course.title}</p>
                    <Link
                      href={`/courses/${certificate.course.slug}`}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium inline-flex items-center gap-1 transition-colors"
                    >
                      Xem khóa học
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                )}
                <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Ngày cấp</p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {new Date(certificate.issuedAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                {certificate.completionSnapshot && (
                  <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Hoàn thành</p>
                    </div>
                    <p className="text-lg font-bold text-gray-900">
                      {certificate.completionSnapshot.completedLessons} / {certificate.completionSnapshot.totalLessons} bài học
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Tại thời điểm cấp chứng chỉ
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-400">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Certificate ID</p>
                  </div>
                  <p className="text-sm font-mono text-gray-700 break-all bg-white p-2 rounded border border-gray-200">{certificate.certificateId}</p>
                </div>
              </div>
            </div>

            {/* New Content Alert */}
            {certificate.hasNewContent && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl">
                    📚
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-blue-700 mb-2 text-base">Nội dung mới có sẵn</h3>
                    <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                      Khóa học đã được cập nhật với các bài học mới sau khi bạn hoàn thành.
                    </p>
                    <div className="bg-white rounded-lg p-3 mb-3 border border-blue-100">
                      <p className="text-xs text-gray-600 mb-1">Tiến độ hiện tại:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{ width: `${certificate.currentProgress.progress}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-semibold text-blue-600">
                          {certificate.currentProgress.completedLessons}/{certificate.currentProgress.totalLessons} ({certificate.currentProgress.progress.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    {certificate?.course && (
                      <Link
                        href={`/courses/${certificate.course.slug}/learn`}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                        Tiếp tục học
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center text-white text-lg">
                  💡
                </div>
                <h3 className="font-bold text-gray-900 text-base">Mẹo hữu ích</h3>
              </div>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Tải xuống PDF để lưu trữ lâu dài</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Chia sẻ link xác minh để người khác kiểm tra</span>
                </li>
                <li className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  <span>In chứng chỉ để treo tường hoặc lưu trữ</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <div className="no-print">
        <Footer />
      </div>
    </div>
  );
}
