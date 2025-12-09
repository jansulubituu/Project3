'use client';

import { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { api } from '@/lib/api';
import { Search, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface UploadedImage {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  folder?: string;
  tags?: string[];
}

function AdminImagesContent() {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [folderFilter, setFolderFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderFilter]);

  const fetchImages = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        maxResults: itemsPerPage,
      };

      if (folderFilter !== 'all') {
        params.folder = folderFilter;
      }

      if (nextCursor && page > 1) {
        params.nextCursor = nextCursor;
      }

      const response = await api.get('/uploads/images', { params });
      if (response.data.success) {
        if (page === 1) {
          setImages(response.data.images || []);
        } else {
          setImages((prev) => [...prev, ...(response.data.images || [])]);
        }
        setNextCursor(response.data.pagination?.nextCursor);
        setHasMore(response.data.pagination?.hasMore || false);
      }
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

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
        alert('Upload ảnh thành công!');
        // Refresh images list
        setPage(1);
        setNextCursor(undefined);
        await fetchImages();
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
    if (!confirm('Bạn có chắc chắn muốn xóa ảnh này?\n\nHành động này không thể hoàn tác!')) {
      return;
    }

    try {
      setActionLoading(image.public_id);
      await api.delete(`/uploads/images/${encodeURIComponent(image.public_id)}`);
      setImages((prev) => prev.filter((img) => img.public_id !== image.public_id));
      alert('Xóa ảnh thành công!');
    } catch (error) {
      console.error('Failed to delete image:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        alert(axiosError.response?.data?.message || 'Có lỗi xảy ra khi xóa ảnh');
      } else {
        alert('Có lỗi xảy ra khi xóa ảnh');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredImages = images.filter((img) =>
    img.secure_url.toLowerCase().includes(searchTerm.toLowerCase()) ||
    img.public_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (img.folder && img.folder.toLowerCase().includes(searchTerm.toLowerCase()))
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

          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm theo URL, public ID hoặc folder..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Folder Filter */}
              <div>
                <select
                  value={folderFilter}
                  onChange={(e) => {
                    setFolderFilter(e.target.value);
                    setPage(1);
                    setNextCursor(undefined);
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả folders</option>
                  <option value="edulearn/course-thumbnails">Course Thumbnails</option>
                  <option value="edulearn/categories">Categories</option>
                  <option value="edulearn/admin-uploads">Admin Uploads</option>
                  <option value="edulearn/uploads">General Uploads</option>
                </select>
              </div>
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
                  {filteredImages.map((image) => (
                    <div
                      key={image.public_id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        <Image
                          src={image.secure_url}
                          alt="Uploaded image"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                        />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleCopyUrl(image.secure_url)}
                            className="text-xs text-blue-600 hover:underline"
                            title="Copy URL"
                          >
                            Copy URL
                          </button>
                          <button
                            onClick={() => handleDelete(image)}
                            disabled={actionLoading === image.public_id}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-gray-500 truncate" title={image.public_id}>
                          {image.public_id}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{image.width} × {image.height}</span>
                          <span>{formatFileSize(image.bytes)}</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(image.created_at).toLocaleDateString('vi-VN')}
                        </div>
                        {image.folder && (
                          <div className="text-xs text-blue-600 truncate" title={image.folder}>
                            📁 {image.folder}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load More */}
                {hasMore && (
                  <div className="p-6 border-t text-center">
                    <button
                      onClick={async () => {
                        setPage((p) => p + 1);
                        await fetchImages();
                      }}
                      disabled={loading}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {loading ? 'Đang tải...' : 'Tải thêm'}
                    </button>
                  </div>
                )}
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

