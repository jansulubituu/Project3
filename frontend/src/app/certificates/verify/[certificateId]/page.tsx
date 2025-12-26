'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import Link from 'next/link';

interface CertificateInfo {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  issuedAt: string;
  completedAt: string;
  completionSnapshot?: {
    totalLessons: number;
    completedLessons: number;
    snapshotDate: string;
  };
}

export default function CertificateVerifyPage() {
  const params = useParams();
  const certificateId = params.certificateId as string;
  
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [certificate, setCertificate] = useState<CertificateInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (certificateId) {
      verifyCertificate();
    }
  }, [certificateId]);

  const verifyCertificate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/certificates/verify/${certificateId}`);
      if (res.data.success && res.data.valid) {
        setValid(true);
        setCertificate(res.data.certificate);
      } else {
        setValid(false);
        setError(res.data.message || 'Chứng chỉ không hợp lệ');
      }
    } catch (err: any) {
      setValid(false);
      setError(err.response?.data?.message || 'Không thể xác minh chứng chỉ');
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
            <p className="mt-4 text-gray-600">Đang xác minh chứng chỉ...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Xác minh chứng chỉ
            </h1>
            <p className="text-gray-600">
              Certificate ID: <span className="font-mono text-sm">{certificateId}</span>
            </p>
          </div>

          {/* Valid Certificate */}
          {valid && certificate && (
            <div className="space-y-6">
              {/* Status Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center px-6 py-3 bg-green-100 border-2 border-green-500 rounded-full">
                  <svg className="w-6 h-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-green-700 font-semibold text-lg">
                    Chứng chỉ hợp lệ
                  </span>
                </div>
              </div>

              {/* Certificate Details */}
              <div className="border border-gray-200 rounded-lg p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Học viên</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {certificate.studentName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Khóa học</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {certificate.courseTitle}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Giảng viên</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {certificate.instructorName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Ngày cấp</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(certificate.issuedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Completion Stats */}
                {certificate.completionSnapshot && (
                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Hoàn thành</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {certificate.completionSnapshot.completedLessons} / {certificate.completionSnapshot.totalLessons} bài học
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ngày hoàn thành: {new Date(certificate.completedAt).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                )}
              </div>

              {/* Additional Info */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>Lưu ý:</strong> Chứng chỉ này được cấp bởi EduLearn và xác nhận rằng học viên đã hoàn thành khóa học tại thời điểm cấp chứng chỉ.
                </p>
              </div>
            </div>
          )}

          {/* Invalid Certificate */}
          {!valid && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="inline-flex items-center px-6 py-3 bg-red-100 border-2 border-red-500 rounded-full">
                  <svg className="w-6 h-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-red-700 font-semibold text-lg">
                    Chứng chỉ không hợp lệ
                  </span>
                </div>
              </div>

              <div className="border border-red-200 rounded-lg p-6 bg-red-50">
                <p className="text-gray-700 text-center">
                  {error || 'Không tìm thấy chứng chỉ với ID này hoặc chứng chỉ đã bị thu hồi.'}
                </p>
              </div>

              <div className="text-center">
                <Link
                  href="/courses"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Khám phá khóa học
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

