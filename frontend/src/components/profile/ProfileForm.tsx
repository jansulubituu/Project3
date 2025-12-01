'use client';

import { useState, FormEvent } from 'react';
import { api } from '@/lib/api';

interface ProfileData {
  _id: string;
  fullName: string;
  bio?: string;
  headline?: string;
  website?: string;
  social?: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
}

interface ProfileFormProps {
  profile: ProfileData;
  onUpdate: (data: Partial<ProfileData>) => void;
  onCancel: () => void;
}

export default function ProfileForm({ profile, onUpdate, onCancel }: ProfileFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    fullName: profile.fullName || '',
    bio: profile.bio || '',
    headline: profile.headline || '',
    website: profile.website || '',
    social: {
      facebook: profile.social?.facebook || '',
      twitter: profile.social?.twitter || '',
      linkedin: profile.social?.linkedin || '',
      youtube: profile.social?.youtube || '',
    },
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Clean up empty social links
      const social: Record<string, string> = {};
      if (formData.social.facebook) social.facebook = formData.social.facebook;
      if (formData.social.twitter) social.twitter = formData.social.twitter;
      if (formData.social.linkedin) social.linkedin = formData.social.linkedin;
      if (formData.social.youtube) social.youtube = formData.social.youtube;

      const updateData = {
        fullName: formData.fullName,
        bio: formData.bio || undefined,
        headline: formData.headline || undefined,
        website: formData.website || undefined,
        social: Object.keys(social).length > 0 ? social : undefined,
      };

      const response = await api.put(`/users/${profile._id}`, updateData);

      if (response.data.success) {
        onUpdate(response.data.user);
      } else {
        setError('Cập nhật thất bại');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Có lỗi xảy ra khi cập nhật profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Chỉnh sửa hồ sơ</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
            Họ và tên *
          </label>
          <input
            type="text"
            id="fullName"
            required
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Headline */}
        <div>
          <label htmlFor="headline" className="block text-sm font-medium text-gray-700 mb-1">
            Tiêu đề nghề nghiệp
          </label>
          <input
            type="text"
            id="headline"
            value={formData.headline}
            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
            placeholder="Ví dụ: Software Developer, Instructor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">
            Giới thiệu
          </label>
          <textarea
            id="bio"
            rows={5}
            value={formData.bio}
            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
            placeholder="Viết một vài dòng giới thiệu về bản thân..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-sm text-gray-500">Tối đa 500 ký tự</p>
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Social Links */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Mạng xã hội</label>
          <div className="space-y-3">
            <div>
              <label htmlFor="linkedin" className="block text-xs text-gray-600 mb-1">
                LinkedIn
              </label>
              <input
                type="url"
                id="linkedin"
                value={formData.social.linkedin}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social: { ...formData.social, linkedin: e.target.value },
                  })
                }
                placeholder="https://linkedin.com/in/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="twitter" className="block text-xs text-gray-600 mb-1">
                Twitter
              </label>
              <input
                type="url"
                id="twitter"
                value={formData.social.twitter}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social: { ...formData.social, twitter: e.target.value },
                  })
                }
                placeholder="https://twitter.com/username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="youtube" className="block text-xs text-gray-600 mb-1">
                YouTube
              </label>
              <input
                type="url"
                id="youtube"
                value={formData.social.youtube}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    social: { ...formData.social, youtube: e.target.value },
                  })
                }
                placeholder="https://youtube.com/@username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </form>
    </div>
  );
}

