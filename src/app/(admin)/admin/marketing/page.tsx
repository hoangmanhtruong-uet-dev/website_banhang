'use client';
import { useState, useEffect } from 'react';
import { useToastStore } from '@/components/ui/Toast';

export default function AdminMarketingPage() {
  const [vouchers, setVouchers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const fetchVouchers = async () => {
    const res = await fetch('/api/admin/vouchers');
    const data = await res.json();
    if (Array.isArray(data)) setVouchers(data);
  };

  useEffect(() => { fetchVouchers(); }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Chiến Dịch Marketing</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Tạo mã giảm giá và quản lý chương trình khuyến mãi toàn sàn.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '12px 24px' }}>➕ Tạo Voucher Mới</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
        {vouchers.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1/-1', padding: '50px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
            Chưa có mã giảm giá nào được tạo.
          </div>
        ) : vouchers.map((v, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', position: 'relative', borderLeft: '6px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'var(--accent)' }}>{v.code}</h3>
              <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 800 }}>ACTIVE</span>
            </div>
            <p style={{ fontSize: '13px', margin: '0 0 15px' }}>{v.description || 'Giảm giá trực tiếp đơn hàng'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              <span>HSD: {new Date(v.endDate).toLocaleDateString('vi-VN')}</span>
              <span>Dùng: {v.usedCount}/{v.usageLimit}</span>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '450px', padding: '40px', background: '#020617' }}>
            <h2 style={{ marginBottom: '25px', fontWeight: 900 }}>Phát hành Voucher</h2>
            <form onSubmit={(e) => { e.preventDefault(); addToast('Đã phát hành Voucher thành công! 🎟️'); setShowAdd(false); }} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Mã (Ví dụ: TET2024)" className="input-field" />
              <input required placeholder="Mô tả" className="input-field" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select className="input-field" style={{ flex: 1 }}>
                  <option value="percentage">Phần trăm (%)</option>
                  <option value="fixed">Số tiền cố định (đ)</option>
                </select>
                <input required type="number" placeholder="Giá trị" className="input-field" style={{ flex: 1 }} />
              </div>
              <input required type="date" className="input-field" />
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAdd(false)} className="btn-secondary" style={{ flex: 1, padding: '12px' }}>Hủy</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, padding: '12px' }}>Xác nhận</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
