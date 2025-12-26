'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Props {
  enrollmentId: string;
  className?: string;
}

export default function CertificateBadge({ enrollmentId, className = '' }: Props) {
  const [certificateUrl, setCertificateUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCertificate();
  }, [enrollmentId]);

  const loadCertificate = async () => {
    try {
      const res = await api.get(`/certificates/enrollment/${enrollmentId}`);
      if (res.data.success && res.data.certificate) {
        setCertificateUrl(res.data.certificate.url);
      }
    } catch (err) {
      // Certificate not issued yet
      setCertificateUrl(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!certificateUrl) {
    return null;
  }

  return (
    <a
      href={certificateUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors ${className}`}
    >
      <svg
        className="w-5 h-5 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
        />
      </svg>
      Xem chứng chỉ
    </a>
  );
}
