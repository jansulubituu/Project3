'use client';

import Link from 'next/link';

export default function PaymentErrorPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 px-4">
      <div className="max-w-lg w-full bg-white shadow-md rounded-lg p-6 space-y-4 text-center">
        <h1 className="text-2xl font-bold text-red-700">Thanh toán thất bại</h1>
        <p className="text-gray-700">Giao dịch không thành công. Vui lòng thử lại hoặc chọn phương thức khác.</p>
        <div className="flex gap-3 justify-center">
          <Link href="/courses" className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700">
            Quay lại khóa học
          </Link>
          <Link href="/support" className="px-4 py-2 rounded-lg border border-red-600 text-red-700 font-semibold hover:bg-red-50">
            Liên hệ hỗ trợ
          </Link>
        </div>
      </div>
    </div>
  );
}









