'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

interface Props {
  courseId: string;
  paymentMethod?: 'BANK_TRANSFER' | 'NAPAS_BANK_TRANSFER';
  label?: string;
}

const SePayButton = ({ courseId, paymentMethod = 'BANK_TRANSFER', label = 'Thanh toán với SePay' }: Props) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitPayment = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/payments/create', {
        courseId,
        payment_method: paymentMethod,
      });
      const { checkoutUrl, fields } = res.data;

      // Build and submit form
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = checkoutUrl;
      Object.keys(fields).forEach((key) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = String(fields[key]);
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      console.error(err);
      setError('Không thể tạo giao dịch SePay. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={submitPayment}
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Đang tạo giao dịch...' : label}
      </button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SePayButton;

