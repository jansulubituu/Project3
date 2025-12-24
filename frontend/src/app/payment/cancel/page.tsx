'use client';

import Link from 'next/link';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-yellow-50 px-4">
      <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-yellow-700">Bạn đã hủy thanh toán</h1>
        <p className="text-gray-700">Giao dịch đã được hủy theo yêu cầu. Bạn có thể thử lại bất cứ lúc nào.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/courses" className="px-4 py-2 rounded-lg bg-yellow-500 text-white font-semibold hover:bg-yellow-600">
            Quay lại khóa học
          </Link>
          <Link href="/my-learning" className="px-4 py-2 rounded-lg border border-yellow-500 text-yellow-700 font-semibold hover:bg-yellow-50">
            Xem My Learning
          </Link>
        </div>
      </div>
    </div>
  );
}


