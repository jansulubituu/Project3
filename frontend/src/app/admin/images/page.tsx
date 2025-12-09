'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Search, Upload, Trash2, Image as ImageIcon, Download } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface UploadedImage {
  url: string;
  publicId: string;
  folder?: string;
  uploadedAt?: string;
}

function AdminImagesContent() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Note: This is a simplified version. In production, you'd want to:
  // 1. Create a backend API to list images from Cloudinary
  // 2. Store image metadata in database
  // 3. Implement proper image management

  useEffect(() => {
    // For now, we'll show a message that this feature needs backend support
    setLoading(false);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file ảnh');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/uploads/image?folder=edulearn/admin-uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        // Add to images list
        setImages((prev) => [
          {
            url: response.data.url,
            publicId: response.data.publicId,
            folder: 'edulearn/admin-uploads',
            uploadedAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        alert('Upload ảnh thành công!');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Có lỗi xảy ra khi upload ảnh');
    } finally {
      setUploading(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('Đã copy URL vào clipboard!');
  };

  const handleDelete = async (image: UploadedImage) => {
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này?\n\nLưu ý: Chức năng xóa cần backend API hỗ trợ.')) {
      return;
    }

    // Note: This requires a backend API to delete from Cloudinary
    alert('Chức năng xóa ảnh cần backend API hỗ trợ. Vui lòng liên hệ developer.');
  };

  const filteredImages = images.filter((img) =>
    img.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.publicId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Quản lý hình ảnh</h1>
                <p className="text-gray-600 mt-2">Quản lý và upload hình ảnh cho hệ thống</p>
              </div>
              <div className="flex items-center space-x-3">
                <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Upload ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  ← Quay lại Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Lưu ý:</strong> Chức năng quản lý hình ảnh hiện tại chỉ hỗ trợ upload. Để xem danh sách tất cả
              ảnh đã upload, cần backend API để lấy danh sách từ Cloudinary hoặc lưu metadata vào database.
            </p>
          </div>

          {/* Search */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Tìm kiếm theo URL hoặc public ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Images Grid */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                Danh sách hình ảnh ({filteredImages.length})
              </h2>
            </div>

            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Đang tải...</p>
              </div>
            ) : filteredImages.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p>Chưa có hình ảnh nào</p>
                <p className="text-sm mt-2">Hãy upload ảnh để bắt đầu</p>
              </div>
            ) : (
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredImages.map((image, index) => (
                    <div
                      key={image.publicId || index}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        <Image
                          src={image.url}
                          alt="Uploaded image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleCopyUrl(image.url)}
                            className="text-xs text-blue-600 hover:underline"
                            title="Copy URL"
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={() => handleDelete(image)}
                            disabled={actionLoading === image.publicId}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 truncate" title={image.publicId}>
                          {image.publicId}
                        </div>
                        {image.uploadedAt && (
                          <div className="text-xs text-gray-400">
                            {new Date(image.uploadedAt).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function AdminImages() {
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <AdminImagesContent />
    </ProtectedRoute>
  );
}

