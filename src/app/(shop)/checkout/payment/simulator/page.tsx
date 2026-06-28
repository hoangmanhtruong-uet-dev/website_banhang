'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

const BALANCE_STORAGE_KEY = 'paymentBalanceSimulator';
const DEFAULT_BALANCE = {
  Banking: 5000000,
  MoMo: 2000000,
};

export default function PaymentSimulatorPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [balances, setBalances] = useState(DEFAULT_BALANCE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(BALANCE_STORAGE_KEY);
    if (stored) {
      try {
        setBalances(JSON.parse(stored));
      } catch {
        setBalances(DEFAULT_BALANCE);
      }
    }
    setLoading(false);
  }, []);

  const updateBalance = (method: 'Banking' | 'MoMo', value: string) => {
    const parsed = Number(value.replace(/[^0-9]/g, ''));
    setBalances(prev => ({ ...prev, [method]: Number.isFinite(parsed) ? parsed : 0 }));
  };

  const handleSave = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(balances));
    addToast('Số dư giả lập đã được cập nhật.');
  };

  const handleReset = () => {
    setBalances(DEFAULT_BALANCE);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(DEFAULT_BALANCE));
    }
    addToast('Đã đặt lại số dư về mặc định.');
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Đang tải...</div>;

  return (
    <div className="page-container">
      <div className="glass-card" style={{ padding: '32px', maxWidth: '720px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Giả lập ngân hàng / ví</h1>
            <p style={{ margin: 0, color: 'var(--text-muted)', maxWidth: '560px' }}>
              Trang này cho phép bạn cấu hình số dư giả lập cho các phương thức thanh toán Banking và MoMo. Dữ liệu được lưu trong trình duyệt và sẽ được sử dụng khi xác thực thanh toán.
            </p>
          </div>
          <button type="button" onClick={() => router.back()} className="btn-secondary" style={{ padding: '10px 18px' }}>
            Quay lại
          </button>
        </div>

        <div style={{ display: 'grid', gap: '24px' }}>
          {(['Banking', 'MoMo'] as const).map((method) => (
            <div key={method} style={{ padding: '24px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>{method === 'Banking' ? 'Ngân hàng' : 'Ví MoMo'}</h2>
                  <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>
                    Số dư hiện tại: <strong>{formatPrice(balances[method])}</strong>
                  </p>
                </div>
              </div>
              <label className="input-label" style={{ marginBottom: '8px', display: 'block' }}>
                Số dư giả lập ({method === 'Banking' ? 'VND tài khoản ngân hàng' : 'VND ví MoMo'})
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={balances[method].toString()}
                onChange={e => updateBalance(method, e.target.value)}
                className="input-field"
                placeholder="Nhập số dư"
              />
            </div>
          ))}

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" onClick={handleSave} className="btn-primary" style={{ minWidth: '180px', padding: '14px 18px' }}>
              Lưu số dư giả lập
            </button>
            <button type="button" onClick={handleReset} className="btn-secondary" style={{ minWidth: '180px', padding: '14px 18px' }}>
              Đặt lại mặc định
            </button>
          </div>

          <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(56, 189, 248, 0.08)', color: '#dbeafe' }}>
            <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Lưu ý</p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              Số dư giả lập chỉ áp dụng cho các đơn hàng được thực hiện sau khi chỉnh số dư. Nếu bạn muốn kiểm tra số dư khác nhau, thay đổi giá trị rồi nhấn Lưu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
