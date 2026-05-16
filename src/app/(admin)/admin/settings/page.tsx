'use client';
import { useToastStore } from '@/components/ui/Toast';

export default function AdminSettingsPage() {
  const addToast = useToastStore(s => s.addToast);

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Cấu Hình Hệ Thống</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Thiết lập các thông số vận hành cốt lõi cho nền tảng MTruong-Store.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* General Info */}
        <div className="glass-card" style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Thông tin Website</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Tên Website</label>
              <input className="input-field" defaultValue="MTRUONG-STORE" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Hotline Hệ Thống</label>
              <input className="input-field" defaultValue="1900 8888" style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Email Liên Hệ</label>
              <input className="input-field" defaultValue="support@mtruong.store" style={{ width: '100%' }} />
            </div>
            <button onClick={() => addToast('Đã lưu cấu hình website! ✨')} className="btn-primary" style={{ marginTop: '10px', padding: '12px' }}>Lưu thông tin</button>
          </div>
        </div>

        {/* Payments Integration */}
        <div className="glass-card" style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Cổng Thanh Toán</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { name: 'Thanh toán COD', status: 'Đã kích hoạt', color: '#10b981' },
              { name: 'Ví MoMo', status: 'Chờ kết nối', color: '#f59e0b' },
              { name: 'VNPAY', status: 'Chưa kích hoạt', color: 'rgba(255,255,255,0.2)' },
              { name: 'Thẻ Tín Dụng (Stripe)', status: 'Đã kích hoạt', color: '#10b981' },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '14px' }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: '11px', color: p.color }}>● {p.status}</p>
                </div>
                <button className="btn-secondary" style={{ fontSize: '11px', padding: '5px 12px' }}>Cấu hình</button>
              </div>
            ))}
          </div>
        </div>

        {/* Security & Backup */}
        <div className="glass-card" style={{ padding: '40px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '25px' }}>Bảo Mật & Dữ Liệu</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>🛡️</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Quét lỗ hổng</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>Kiểm tra an toàn hệ thống</p>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>Bắt đầu quét</button>
            </div>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>💾</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Sao lưu Database</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>Lần cuối: 2 giờ trước</p>
              <button onClick={() => addToast('Bắt đầu sao lưu dữ liệu... ⏳')} className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>Tải bản sao lưu</button>
            </div>
            <div style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '24px', margin: '0 0 10px' }}>🚀</p>
              <p style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 5px' }}>Xóa Cache</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '15px' }}>Tối ưu hóa tốc độ tải trang</p>
              <button className="btn-secondary" style={{ width: '100%', fontSize: '12px' }}>Dọn dẹp ngay</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
