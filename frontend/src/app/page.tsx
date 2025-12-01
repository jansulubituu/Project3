'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface HealthResponse {
  success: boolean;
  message: string;
  environment: string;
  timestamp: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await api.get<HealthResponse>('/health');
        setHealth(response.data);
        setError('');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to connect to backend';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-4xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            🎓 EduLearn
          </h1>
          <p className="text-xl text-gray-600">
            E-Learning Platform
          </p>
          
          {/* Auth Buttons */}
          <div className="flex justify-center gap-4 mt-6">
            <a
              href="/login"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Đăng nhập
            </a>
            <a
              href="/register"
              className="px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Đăng ký
            </a>
          </div>
        </div>

        {/* Backend Status Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
          <h2 className="text-2xl font-semibold text-gray-800">
            Backend Connection Status
          </h2>

          {loading && (
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Checking connection...</span>
            </div>
          )}

          {!loading && health && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">✅</span>
                <span className="text-lg font-semibold text-green-600">
                  Connected Successfully!
                </span>
              </div>
              <div className="bg-gray-50 rounded-md p-4 space-y-2 font-mono text-sm">
                <div>
                  <span className="text-gray-600">Message:</span>{' '}
                  <span className="text-gray-900">{health.message}</span>
                </div>
                <div>
                  <span className="text-gray-600">Environment:</span>{' '}
                  <span className="text-gray-900">{health.environment}</span>
                </div>
                <div>
                  <span className="text-gray-600">Timestamp:</span>{' '}
                  <span className="text-gray-900">
                    {new Date(health.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">❌</span>
                <span className="text-lg font-semibold text-red-600">
                  Connection Failed
                </span>
              </div>
              <div className="bg-red-50 rounded-md p-4 text-red-700">
                {error}
              </div>
              <p className="text-sm text-gray-600">
                Make sure the backend server is running on{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}
                </code>
              </p>
            </div>
          )}
        </div>

        {/* Tech Stack */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Tech Stack</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Frontend</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Next.js 14 (App Router)</li>
                <li>✅ TypeScript</li>
                <li>✅ TailwindCSS</li>
                <li>✅ Axios</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-700">Backend</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>✅ Express.js</li>
                <li>✅ TypeScript</li>
                <li>✅ MongoDB</li>
                <li>✅ JWT Auth</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-white rounded-lg shadow-lg p-8 space-y-4">
          <h2 className="text-2xl font-semibold text-gray-800">Next Steps</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Configure MongoDB Atlas connection</li>
            <li>Setup Cloudinary for media uploads</li>
            <li>Configure Stripe for payments</li>
            <li>Start building features!</li>
          </ol>
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <p className="text-sm text-blue-800">
              📚 Check{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">
                docs/GETTING_STARTED.md
              </code>{' '}
              for detailed setup instructions.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


