'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

interface Voucher {
  id: string;
  code: string;
  description?: string | null;
  discountType: 'percentage' | 'fixed';
  discountValue: string;
  minOrderValue: string;
  maxDiscount?: string | null;
  endDate: string;
  usageLimit: number;
  usedCount: number;
  seller?: { name: string } | null;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    fetch('/api/user/vouchers')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tải voucher');
        setVouchers(Array.isArray(data) ? data : []);
      })
      .catch(caught => addToast(caught instanceof Error ? caught.message : 'Không thể tải voucher'))
      .finally(() => setLoading(false));
  }, [addToast]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      addToast(`Đã sao chép mã ${code}.`);
    } catch {
      addToast(`Mã voucher: ${code}`);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '30px', borderRadius: '24px', minHeight: '400px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Kho voucher</h1>
      {loading ? (
        <p>Đang tải voucher...</p>
      ) : vouchers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🎟️</div>
          Hiện chưa có voucher khả dụng.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {vouchers.map(voucher => (
            <article key={voucher.id} style={{ padding: '20px', borderRadius: '18px', border: '1px dashed var(--accent)', background: 'rgba(245,158,11,0.06)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <strong style={{ color: 'var(--accent)', fontSize: '18px' }}>{voucher.code}</strong>
                  <p style={{ marginTop: '8px', fontWeight: 600 }}>
                    {voucher.discountType === 'percentage' ? `Giảm ${Number(voucher.discountValue)}%` : `Giảm ${formatPrice(voucher.discountValue)}`}
                  </p>
                </div>
                <button type="button" className="btn-secondary" onClick={() => copyCode(voucher.code)}>Sao chép</button>
              </div>
              {voucher.description && <p style={{ color: 'var(--text-muted)', marginTop: '12px' }}>{voucher.description}</p>}
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '10px' }}>Đơn tối thiểu: {formatPrice(voucher.minOrderValue)}</p>
              {voucher.maxDiscount && <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Giảm tối đa: {formatPrice(voucher.maxDiscount)}</p>}
              <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Hết hạn: {new Date(voucher.endDate).toLocaleDateString('vi-VN')}</p>
              {voucher.seller?.name && <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '6px' }}>Phát hành bởi {voucher.seller.name}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}