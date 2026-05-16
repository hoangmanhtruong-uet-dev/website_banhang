'use client';
import { useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';

export default function MarketingPage() {
  const [showAdd, setShowAdd] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Chương Trình Khuyến Mãi</h1>
          <p style={{ color: 'var(--text-muted)' }}>Tạo mã giảm giá để thu hút khách hàng và tăng doanh số cho shop của bạn.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ padding: '12px 24px' }}>
          ➕ Tạo Voucher mới
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid var(--accent)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>GIAM50K</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0' }}>Giảm 50.000đ cho đơn từ 500k</p>
            </div>
            <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 700 }}>ĐANG CHẠY</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Đã dùng: 12/100</p>
              <p style={{ margin: 0 }}>Hết hạn: 31/12/2026</p>
            </div>
            <button className="btn-secondary" style={{ padding: '5px 15px', fontSize: '11px' }}>Sửa</button>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, opacity: 0.5 }}>FREESHIP</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '5px 0 0' }}>Miễn phí vận chuyển toàn quốc</p>
            </div>
            <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 700 }}>HẾT HẠN</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              <p style={{ margin: 0 }}>Đã dùng: 100/100</p>
              <p style={{ margin: 0 }}>Hết hạn: 01/01/2026</p>
            </div>
            <button className="btn-secondary" style={{ padding: '5px 15px', fontSize: '11px' }}>Kích hoạt lại</button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ background: '#121212', width: '500px', padding: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>Tạo Voucher mới</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input placeholder="Mã Voucher (Ví dụ: HELLO2024)" className="input-field" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <select className="input-field" style={{ flex: 1 }}>
                  <option>Phần trăm (%)</option>
                  <option>Số tiền cố định (đ)</option>
                </select>
                <input placeholder="Giá trị" className="input-field" style={{ flex: 1 }} />
              </div>
              <input placeholder="Đơn hàng tối thiểu" className="input-field" />
              <input type="date" className="input-field" placeholder="Ngày kết thúc" />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button onClick={() => setShowAdd(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Hủy</button>
                <button onClick={() => { addToast('Tính năng đang được hoàn thiện! 🚧'); setShowAdd(false); }} className="btn-primary" style={{ padding: '10px 20px' }}>Tạo ngay</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
