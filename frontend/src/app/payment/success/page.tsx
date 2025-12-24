'use client';

import Link from 'next/link';

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 px-4">
      <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-green-700">Thanh toán thành công</h1>
        <p className="text-gray-700">Cảm ơn bạn đã hoàn tất thanh toán. Bạn có thể xem khóa học của mình trong mục My Learning.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/my-learning" className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700">
            Đến My Learning
          </Link>
          <Link href="/courses" className="px-4 py-2 rounded-lg border border-green-600 text-green-700 font-semibold hover:bg-green-50">
            Tiếp tục xem khóa học
          </Link>
        </div>
      </div>
    </div>
  );
}


