'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import AvatarUpload from '@/components/profile/AvatarUpload';
import ProfileForm from '@/components/profile/ProfileForm';

interface ProfileData {
  _id: string;
  email: string;
  fullName: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
  bio?: string;
  headline?: string;
  website?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  isEmailVerified: boolean;
  // Additional data
  enrollments?: Array<{
    _id: string;
    course: {
      _id: string;
      title: string;
      thumbnail: string;
    };
    progress: number;
    status: string;
  }>;
  totalEnrollments?: number;
  completedCourses?: number;
  courses?: Array<{
    _id: string;
    title: string;
    thumbnail: string;
    status: string;
    enrollmentCount: number;
  }>;
  totalCourses?: number;
  publishedCourses?: number;
  totalStudents?: number;
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

function ProfileContent() {
  const { logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users/me/profile');
      if (response.data.success) {
        setProfile(response.data.user);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Không thể tải thông tin profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (newAvatar: string) => {
    if (profile) {
      setProfile({ ...profile, avatar: newAvatar });
    }
    // Refresh auth context
    await refreshUser();
  };

  const handleProfileUpdate = (updatedData: Partial<ProfileData>) => {
    if (profile) {
      setProfile({ ...profile, ...updatedData });
    }
    setEditing(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Không tìm thấy profile'}</p>
          <button
            onClick={fetchProfile}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-2xl font-bold text-gray-900">
                🎓 EduLearn
              </Link>
              <nav className="hidden md:flex space-x-4">
                <Link href="/dashboard" className="text-gray-700 hover:text-blue-600">
                  Dashboard
                </Link>
                <Link href="/courses" className="text-gray-700 hover:text-blue-600">
                  Khóa học
                </Link>
                <Link href="/profile" className="text-blue-600 font-medium">
                  Hồ sơ
                </Link>
              </nav>
            </div>
            <button
              onClick={logout}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-32"></div>
          <div className="px-6 pb-6 -mt-16">
            <div className="flex flex-col md:flex-row items-start md:items-end space-y-4 md:space-y-0 md:space-x-6">
              {/* Avatar */}
              <div className="relative">
                <div className="h-32 w-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                  {profile.avatar && !profile.avatar.includes('default-avatar') ? (
                    <Image
                      src={profile.avatar}
                      alt={profile.fullName}
                      width={128}
                      height={128}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                      {profile.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                {!editing && (
                  <div className="absolute bottom-0 right-0">
                    <AvatarUpload userId={profile._id} onSuccess={handleAvatarUpdate} />
                  </div>
                )}
              </div>

              {/* Profile Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
                    {profile.headline && (
                      <p className="text-lg text-gray-600 mt-1">{profile.headline}</p>
                    )}
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-gray-500 capitalize">{profile.role}</span>
                      {profile.isEmailVerified && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          ✓ Đã xác thực
                        </span>
                      )}
                    </div>
                  </div>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Chỉnh sửa
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Section */}
            {editing ? (
              <ProfileForm
                profile={profile}
                onUpdate={handleProfileUpdate}
                onCancel={() => setEditing(false)}
              />
            ) : (
              <>
                {profile.bio && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Giới thiệu</h2>
                    <p className="text-gray-700 whitespace-pre-line">{profile.bio}</p>
                  </div>
                )}

                {/* Contact Info */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Thông tin liên hệ</h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{profile.email}</dd>
                    </div>
                    {profile.website && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Website</dt>
                        <dd className="mt-1 text-sm">
                          <a
                            href={profile.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {profile.website}
                          </a>
                        </dd>
                      </div>
                    )}
                    {profile.social && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500 mb-2">Mạng xã hội</dt>
                        <dd className="flex space-x-4">
                          {profile.social.linkedin && (
                            <a
                              href={profile.social.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              LinkedIn
                            </a>
                          )}
                          {profile.social.twitter && (
                            <a
                              href={profile.social.twitter}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              Twitter
                            </a>
                          )}
                          {profile.social.youtube && (
                            <a
                              href={profile.social.youtube}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              YouTube
                            </a>
                          )}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </>
            )}

            {/* Courses/Enrollments Section */}
            {profile.role === 'student' && profile.enrollments && profile.enrollments.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Khóa học đã đăng ký
                </h2>
                <div className="space-y-4">
                  {profile.enrollments.map((enrollment) => (
                    <div key={enrollment._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {enrollment.course.thumbnail && (
                        <Image
                          src={enrollment.course.thumbnail}
                          alt={enrollment.course.title}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{enrollment.course.title}</h3>
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                            <span>Tiến độ</span>
                            <span>{enrollment.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${enrollment.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.role === 'instructor' && profile.courses && profile.courses.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Khóa học của tôi</h2>
                <div className="space-y-4">
                  {profile.courses.map((course) => (
                    <div key={course._id} className="flex items-center space-x-4 p-4 border rounded-lg">
                      {course.thumbnail && (
                        <Image
                          src={course.thumbnail}
                          alt={course.title}
                          width={80}
                          height={80}
                          className="rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">{course.title}</h3>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                          <span>{course.enrollmentCount} học viên</span>
                          <span className="capitalize">{course.status}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Thống kê</h2>
              {profile.role === 'student' && (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tổng khóa học</dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {profile.totalEnrollments || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Đã hoàn thành</dt>
                    <dd className="mt-1 text-2xl font-semibold text-green-600">
                      {profile.completedCourses || 0}
                    </dd>
                  </div>
                </dl>
              )}
              {profile.role === 'instructor' && (
                <dl className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tổng khóa học</dt>
                    <dd className="mt-1 text-2xl font-semibold text-gray-900">
                      {profile.totalCourses || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Đã xuất bản</dt>
                    <dd className="mt-1 text-2xl font-semibold text-green-600">
                      {profile.publishedCourses || 0}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Tổng học viên</dt>
                    <dd className="mt-1 text-2xl font-semibold text-blue-600">
                      {profile.totalStudents || 0}
                    </dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

