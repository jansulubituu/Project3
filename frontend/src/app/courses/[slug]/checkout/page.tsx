'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import SePayButton from '@/components/payments/SePayButton';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

type PaymentMethod = 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';

interface Course {
  _id: string;
  title: string;
  slug: string;
  thumbnail?: string;
  shortDescription?: string;
  price: number;
  discountPrice?: number;
  currency?: string;
  instructor: {
    fullName: string;
  };
}

export default function CourseCheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const slug = params?.slug as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [freeEnrollLoading, setFreeEnrollLoading] = useState(false);
  const [freeEnrollError, setFreeEnrollError] = useState('');

  const finalPrice = useMemo(() => {
    if (!course) return 0;
    if (course.discountPrice && course.discountPrice < course.price) return course.discountPrice;
    return course.price;
  }, [course]);

  useEffect(() => {
    if (authLoading) return;
    // Require auth for checkout
    if (!isAuthenticated) {
      router.replace(`/login?redirect=/courses/${slug}/checkout`);
      return;
    }

    if (user && user.role !== 'student') {
      setError('Chỉ học viên mới có thể thanh toán khóa học này');
      setLoading(false);
      return;
    }

    const fetchCourse = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/courses/${slug}`);
        if (response.data.success) {
          setCourse(response.data.course);
          setIsEnrolled(response.data.isEnrolled || false);
        } else {
          setError('Không tìm thấy khóa học');
        }
      } catch (err) {
        console.error('Failed to load course checkout data', err);
        setError('Không thể tải thông tin khóa học');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchCourse();
    }
  }, [isAuthenticated, authLoading, router, slug, user]);

  useEffect(() => {
    if (isEnrolled && course) {
      router.replace(`/courses/${course.slug}/learn`);
    }
  }, [isEnrolled, course, router]);

  const formatPrice = (priceValue: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(priceValue);

  const handleFreeEnroll = async () => {
    if (!course) return;
    setFreeEnrollLoading(true);
    setFreeEnrollError('');
    try {
      const res = await api.post('/enrollments', { course: course._id });
      if (res.data.success) {
        // Trigger event to refresh my-learning page
        window.dispatchEvent(new Event('enrollmentUpdated'));
        localStorage.setItem('enrollment_updated', Date.now().toString());
        router.replace(`/courses/${course.slug}/learn`);
      } else {
        setFreeEnrollError(res.data.message || 'Không thể đăng ký khóa học miễn phí');
      }
    } catch (err) {
      console.error('Free enrollment failed', err);
      setFreeEnrollError('Không thể đăng ký khóa học miễn phí, vui lòng thử lại.');
    } finally {
      setFreeEnrollLoading(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="mt-4 text-gray-600">Đang tải thông tin thanh toán...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-white border rounded-lg shadow-sm p-6 space-y-4 text-center">
            <h1 className="text-xl font-semibold text-gray-900">Không thể thanh toán</h1>
            <p className="text-gray-600">{error || 'Khóa học không tồn tại'}</p>
            <Link
              href="/courses"
              className="inline-block px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
            >
              Quay lại khóa học
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (isEnrolled) {
    return null; // Redirect handled in useEffect
  }

  const isFree = finalPrice === 0;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="mb-6">
            <nav className="text-sm text-gray-500">
              <Link href="/courses" className="hover:text-gray-800">
                Khóa học
              </Link>
              <span className="mx-2">/</span>
              <Link href={`/courses/${course.slug}`} className="hover:text-gray-800">
                {course.title}
              </Link>
              <span className="mx-2">/</span>
              <span className="text-gray-800 font-medium">Thanh toán</span>
            </nav>
            <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900">Thanh toán khóa học</h1>
            <p className="text-gray-600 mt-1">{course.shortDescription}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white border rounded-lg shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Khóa học</p>
                    <p className="text-lg font-semibold text-gray-900">{course.title}</p>
                    <p className="text-sm text-gray-600 mt-1">Giảng viên: {course.instructor.fullName}</p>
                  </div>
                  {course.thumbnail ? (
                    <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                    </div>
                  ) : null}
                </div>

                {!isFree && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-800">Chọn phương thức thanh toán</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {(['BANK_TRANSFER', 'NAPAS_BANK_TRANSFER'] as PaymentMethod[]).map((method) => (
                        <label
                          key={method}
                          className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
                            paymentMethod === method ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <input
                            type="radio"
                            name="payment-method"
                            value={method}
                            checked={paymentMethod === method}
                            onChange={() => setPaymentMethod(method)}
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {method === 'BANK_TRANSFER' ? 'Chuyển khoản ngân hàng' : 'Napas Bank Transfer'}
                            </p>
                            <p className="text-sm text-gray-600">
                              Xử lý qua SePay, tự động kích hoạt sau khi thanh toán thành công.
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {isFree ? (
                  <div className="space-y-3">
                    {freeEnrollError && (
                      <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">
                        {freeEnrollError}
                      </p>
                    )}
                    <button
                      onClick={handleFreeEnroll}
                      disabled={freeEnrollLoading}
                      className="w-full rounded-lg bg-green-600 px-4 py-3 text-white font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      {freeEnrollLoading ? 'Đang đăng ký...' : 'Đăng ký miễn phí'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <SePayButton
                      courseId={course._id}
                      paymentMethod={paymentMethod}
                      label="Thanh toán qua SePay"
                    />
                    <p className="text-xs text-gray-500 text-center">
                      Sau khi thanh toán, bạn sẽ được chuyển hướng về trang xác nhận. Nếu có vấn đề, hãy kiểm tra
                      email hoặc mục My Learning.
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-semibold mb-1">Lưu ý:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Đảm bảo thông tin ngân hàng chính xác khi thực hiện chuyển khoản.</li>
                  <li>Không đóng trình duyệt cho đến khi giao dịch hoàn tất.</li>
                  <li>Nếu gặp lỗi, bạn có thể thử lại hoặc liên hệ hỗ trợ.</li>
                </ul>
              </div>
            </div>

            <aside className="bg-white border rounded-lg shadow-sm p-5 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Tóm tắt đơn hàng</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Giá gốc</span>
                  <span>{formatPrice(course.price)}</span>
                </div>
                {course.discountPrice && course.discountPrice < course.price && (
                  <div className="flex justify-between text-green-700">
                    <span>Giảm giá</span>
                    <span>-{formatPrice(course.price - course.discountPrice)}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2 flex justify-between text-base font-semibold text-gray-900">
                  <span>Tổng thanh toán</span>
                  <span>{isFree ? 'Miễn phí' : formatPrice(finalPrice)}</span>
                </div>
              </div>
              <div className="text-xs text-gray-500">
                Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách hoàn tiền của EduLearn.
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}


