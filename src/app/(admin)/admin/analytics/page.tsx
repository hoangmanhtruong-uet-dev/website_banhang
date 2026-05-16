'use client';
import { formatPrice } from '@/lib/utils';

export default function AdminAnalyticsPage() {
  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Báo Cáo Doanh Thu & Hệ Thống</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Dữ liệu phân tích chuyên sâu cho toàn bộ nền tảng.</p>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '40px', minHeight: '400px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800 }}>Biểu đồ tăng trưởng doanh số</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary" style={{ padding: '5px 15px', fontSize: '11px' }}>Tuần</button>
              <button className="btn-primary" style={{ padding: '5px 15px', fontSize: '11px' }}>Tháng</button>
            </div>
          </div>
          {/* SVG Chart Placeholder */}
          <div style={{ height: '250px', width: '100%', position: 'relative', marginTop: '50px' }}>
             <svg viewBox="0 0 100 20" style={{ width: '100%', height: '100%' }}>
                <polyline
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="0.3"
                  points="0,15 10,12 20,18 30,10 40,14 50,5 60,9 70,3 80,8 90,4 100,6"
                />
             </svg>
             <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                <span>Tháng 1</span><span>Tháng 3</span><span>Tháng 6</span><span>Tháng 9</span><span>Tháng 12</span>
             </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '40px' }}>
          <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '30px' }}>Cơ cấu người dùng</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
            {[
              { label: 'Khách hàng', val: 82, color: 'var(--accent)' },
              { label: 'Người bán', val: 12, color: '#10b981' },
              { label: 'Nhân viên/Admin', val: 6, color: '#f59e0b' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '13px' }}>
                  <span>{item.label}</span>
                  <span style={{ fontWeight: 800 }}>{item.val}%</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                  <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px' }}>
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Top Khu Vực Mua Hàng</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>Hà Nội</span><span style={{ fontWeight: 700 }}>45%</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <span>TP. Hồ Chí Minh</span><span style={{ fontWeight: 700 }}>32%</span>
            </li>
            <li style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0' }}>
              <span>Đà Nẵng</span><span style={{ fontWeight: 700 }}>12%</span>
            </li>
          </ul>
        </div>

        <div className="glass-card" style={{ padding: '30px', gridColumn: 'span 2' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '20px' }}>Sản Phẩm "Hot" Toàn Hệ Thống</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, padding: '20px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '30px', marginBottom: '10px' }}>📦</div>
                <p style={{ margin: '0 0 5px', fontSize: '14px', fontWeight: 700 }}>Sản phẩm #{i}</p>
                <p style={{ margin: 0, fontSize: '12px', color: '#10b981' }}>Doanh thu: {formatPrice(12000000)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
