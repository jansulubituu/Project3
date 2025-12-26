'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Props {
  enrollmentId: string;
  courseTitle: string;
  initialCertificateUrl?: string;
  initialCertificateId?: string;
  isCompleted: boolean;
  progress: number;
}

interface CertificateStatus {
  isCompleted: boolean;
  progress: number;
  certificateIssued: boolean;
  certificateUrl?: string;
  certificateId?: string;
  hasNewContent: boolean;
  completionSnapshot?: {
    totalLessons: number;
    completedLessons: number;
    snapshotDate: string;
  };
  current: {
    totalLessons: number;
    completedLessons: number;
  };
}

export default function CertificateCard({
  enrollmentId,
  courseTitle,
  initialCertificateUrl,
  initialCertificateId,
  isCompleted,
  progress,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<CertificateStatus | null>(null);
  const [certificateUrl, setCertificateUrl] = useState(initialCertificateUrl);
  const [certificateId, setCertificateId] = useState(initialCertificateId);

  useEffect(() => {
    if (isCompleted) {
      loadCertificateStatus();
    }
  }, [isCompleted, enrollmentId]);

  const loadCertificateStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/certificates/enrollment/${enrollmentId}/status`);
      if (res.data.success) {
        setStatus(res.data.status);
        if (res.data.status.certificateUrl) {
          setCertificateUrl(res.data.status.certificateUrl);
          setCertificateId(res.data.status.certificateId);
        }
      }
    } catch (err: any) {
      console.error('Failed to load certificate status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCertificate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await api.post(`/certificates/enrollment/${enrollmentId}/generate`);
      if (res.data.success) {
        setCertificateUrl(res.data.certificateUrl);
        setCertificateId(res.data.certificateId);
        await loadCertificateStatus();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tạo chứng chỉ');
    } finally {
      setGenerating(false);
    }
  };

  // Not completed yet
  if (!isCompleted || progress < 100) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="text-2xl">🎓</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-700 mb-1">Chứng chỉ chưa khả dụng</h3>
            <p className="text-sm text-gray-600 mb-2">
              Hoàn thành tất cả bài học để nhận chứng chỉ
            </p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">{progress.toFixed(1)}% hoàn thành</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading certificate status
  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Đang kiểm tra chứng chỉ...</span>
        </div>
      </div>
    );
  }

  // Certificate issued
  if (certificateUrl && certificateId) {
    return (
      <div className="space-y-3">
        {/* Certificate earned */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-2xl">🎉</div>
            <div className="flex-1">
              <h3 className="font-semibold text-green-700 mb-1">
                Chứng chỉ đã được cấp!
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {status?.completionSnapshot && (
                  <>
                    Hoàn thành {status.completionSnapshot.completedLessons}/
                    {status.completionSnapshot.totalLessons} bài học
                  </>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <a
                  href={certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  Xem chứng chỉ
                </a>
                <a
                  href={certificateUrl}
                  download
                  className="px-4 py-2 border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm font-medium"
                >
                  Tải xuống
                </a>
                <Link
                  href={`/certificates/verify/${certificateId}`}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Xác minh
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* New content notification */}
        {status?.hasNewContent && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">📚</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-700 mb-1">
                  Nội dung mới có sẵn
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Khóa học đã được cập nhật với các bài học mới. Hoàn thành để cập nhật chứng chỉ!
                </p>
                <p className="text-xs text-gray-500 mb-3">
                  Tiến độ hiện tại: {status.current.completedLessons}/
                  {status.current.totalLessons} bài học ({status.progress.toFixed(1)}%)
                </p>
                <Link
                  href={`/courses/${(status as any).courseSlug || '#'}`}
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Tiếp tục học
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Certificate ready to generate (completed but not generated yet)
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <div className="text-2xl">🎓</div>
        <div className="flex-1">
          <h3 className="font-semibold text-blue-700 mb-1">Chứng chỉ sẵn sàng!</h3>
          <p className="text-sm text-gray-600 mb-3">
            Tạo chứng chỉ hoàn thành cho khóa học <strong>{courseTitle}</strong>
          </p>
          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}
          <button
            onClick={handleGenerateCertificate}
            disabled={generating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {generating ? 'Đang tạo...' : 'Tạo chứng chỉ'}
          </button>
        </div>
      </div>
    </div>
  );
}

