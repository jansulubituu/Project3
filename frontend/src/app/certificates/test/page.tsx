'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CertificateCard from '@/components/certificates/CertificateCard';

export default function CertificateTestPage() {
  return (
    <ProtectedRoute>
      <CertificateTestContent />
    </ProtectedRoute>
  );
}

function CertificateTestContent() {
  const [enrollmentId, setEnrollmentId] = useState('');
  const [showCard, setShowCard] = useState(false);
  const [testData, setTestData] = useState({
    courseTitle: 'Test Course',
    isCompleted: true,
    progress: 100,
  });

  // Test API calls
  const [apiLoading, setApiLoading] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);

  const testGetStatus = async () => {
    if (!enrollmentId) {
      alert('Nhập enrollment ID');
      return;
    }
    setApiLoading(true);
    setApiResult(null);
    try {
      const res = await api.get(`/certificates/enrollment/${enrollmentId}/status`);
      setApiResult({
        endpoint: 'GET /certificates/enrollment/:id/status',
        success: true,
        data: res.data,
      });
    } catch (err: any) {
      setApiResult({
        endpoint: 'GET /certificates/enrollment/:id/status',
        success: false,
        error: err.response?.data || err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  const testGenerateCert = async () => {
    if (!enrollmentId) {
      alert('Nhập enrollment ID');
      return;
    }
    setApiLoading(true);
    setApiResult(null);
    try {
      const res = await api.post(`/certificates/enrollment/${enrollmentId}/generate`);
      setApiResult({
        endpoint: 'POST /certificates/enrollment/:id/generate',
        success: true,
        data: res.data,
      });
    } catch (err: any) {
      setApiResult({
        endpoint: 'POST /certificates/enrollment/:id/generate',
        success: false,
        error: err.response?.data || err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  const testGetCert = async () => {
    if (!enrollmentId) {
      alert('Nhập enrollment ID');
      return;
    }
    setApiLoading(true);
    setApiResult(null);
    try {
      const res = await api.get(`/certificates/enrollment/${enrollmentId}`);
      setApiResult({
        endpoint: 'GET /certificates/enrollment/:id',
        success: true,
        data: res.data,
      });
    } catch (err: any) {
      setApiResult({
        endpoint: 'GET /certificates/enrollment/:id',
        success: false,
        error: err.response?.data || err.message,
      });
    } finally {
      setApiLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Certificate Module - Test Page
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: API Testing */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Testing
            </h2>

            {/* Enrollment ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enrollment ID
              </label>
              <input
                type="text"
                value={enrollmentId}
                onChange={(e) => setEnrollmentId(e.target.value)}
                placeholder="Enter enrollment ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lấy từ My Learning hoặc API response
              </p>
            </div>

            {/* API Buttons */}
            <div className="space-y-2">
              <button
                onClick={testGetStatus}
                disabled={apiLoading || !enrollmentId}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test: Get Status
              </button>
              <button
                onClick={testGetCert}
                disabled={apiLoading || !enrollmentId}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test: Get Certificate
              </button>
              <button
                onClick={testGenerateCert}
                disabled={apiLoading || !enrollmentId}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test: Generate Certificate
              </button>
            </div>

            {/* API Result */}
            {apiResult && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  API Response:
                </h3>
                <div className={`p-3 rounded-lg border ${
                  apiResult.success 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>{apiResult.endpoint}</strong>
                  </p>
                  <pre className="text-xs overflow-auto max-h-96">
                    {JSON.stringify(apiResult.success ? apiResult.data : apiResult.error, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Right: Component Preview */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Component Preview
            </h2>

            {/* Test Controls */}
            <div className="space-y-3 pb-4 border-b">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Enrollment ID (for component)
                </label>
                <input
                  type="text"
                  value={enrollmentId}
                  onChange={(e) => setEnrollmentId(e.target.value)}
                  placeholder="Same as above"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Progress
                  </label>
                  <input
                    type="number"
                    value={testData.progress}
                    onChange={(e) => setTestData({ ...testData, progress: Number(e.target.value) })}
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Completed?
                  </label>
                  <select
                    value={testData.isCompleted ? 'true' : 'false'}
                    onChange={(e) => setTestData({ ...testData, isCompleted: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              </div>

              <button
                onClick={() => setShowCard(true)}
                disabled={!enrollmentId}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Show Certificate Card
              </button>
            </div>

            {/* Certificate Card Preview */}
            {showCard && enrollmentId && (
              <div className="pt-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  CertificateCard Component:
                </h3>
                <CertificateCard
                  enrollmentId={enrollmentId}
                  courseTitle={testData.courseTitle}
                  isCompleted={testData.isCompleted}
                  progress={testData.progress}
                />
              </div>
            )}

            {!showCard && (
              <div className="pt-4 text-center text-gray-500 text-sm">
                Nhập enrollment ID và nhấn &quot;Show Certificate Card&quot;
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-3">
            📋 Hướng dẫn test
          </h2>
          <ol className="space-y-2 text-sm text-gray-700">
            <li>
              <strong>1. Lấy Enrollment ID:</strong> Vào My Learning, mở Console (F12), xem enrollments array
            </li>
            <li>
              <strong>2. Test Status:</strong> Nhấn &quot;Test: Get Status&quot; để xem trạng thái certificate
            </li>
            <li>
              <strong>3. Generate:</strong> Nếu chưa có certificate, nhấn &quot;Test: Generate Certificate&quot;
            </li>
            <li>
              <strong>4. Get Certificate:</strong> Sau khi generate, nhấn &quot;Test: Get Certificate&quot; để lấy URL
            </li>
            <li>
              <strong>5. Preview Component:</strong> Nhấn &quot;Show Certificate Card&quot; để xem component
            </li>
            <li>
              <strong>6. Verify:</strong> Copy certificate ID từ response, paste vào URL: /certificates/verify/CERT-xxx
            </li>
          </ol>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Lưu ý:</strong> Để test certificate generation, enrollment phải có status = &apos;completed&apos; và progress = 100%
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href="/my-learning"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            → My Learning
          </a>
          <a
            href="/courses"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            → Courses
          </a>
          <a
            href="/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            → Dashboard
          </a>
        </div>
      </main>

      <Footer />
    </div>
  );
}
