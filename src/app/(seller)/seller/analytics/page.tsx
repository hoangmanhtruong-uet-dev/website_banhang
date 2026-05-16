'use client';
import { formatPrice } from '@/lib/utils';

export default function AnalyticsPage() {
  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Phân Tích Bán Hàng</h1>
        <p style={{ color: 'var(--text-muted)' }}>Dữ liệu chuyên sâu giúp bạn hiểu rõ hành vi khách hàng và tối ưu doanh thu.</p>
      </div>

      {/* Top Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '30px' }}>
        {[
          { label: 'Lượt truy cập', value: '1.2k', trend: '+15%' },
          { label: 'Tỉ lệ chuyển đổi', value: '3.4%', trend: '+0.5%' },
          { label: 'Doanh thu/Đơn', value: formatPrice(350000), trend: '-2%' },
          { label: 'Khách hàng mới', value: '24', trend: '+8' },
        ].map((s, i) => (
          <div key={i} className="glass-card" style={{ padding: '20px' }}>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 10px' }}>{s.label}</p>
            <h3 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 5px' }}>{s.value}</h3>
            <span style={{ fontSize: '11px', color: s.trend.startsWith('+') ? '#10b981' : '#ef4444' }}>{s.trend} so với tuần trước</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Sales by Category */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '25px' }}>Doanh thu theo danh mục</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {[
              { label: 'Thời trang nam', val: 75, color: 'var(--accent)' },
              { label: 'Phụ kiện', val: 45, color: '#8b5cf6' },
              { label: 'Giày dép', val: 30, color: '#f59e0b' },
            ].map((item, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
                  <span>{item.label}</span>
                  <span style={{ fontWeight: 700 }}>{item.val}%</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                  <div style={{ width: `${item.val}%`, height: '100%', background: item.color, borderRadius: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '25px' }}>Sản phẩm bán chạy nhất</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {[
              { name: 'Áo thun MTruong Pro', sales: 154, price: 250000 },
              { name: 'Quần Jean Slimfit', sales: 98, price: 550000 },
              { name: 'Giày Sneaker White', sales: 42, price: 1200000 },
            ].map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '15px', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '14px' }}>{p.name}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{p.sales} đã bán</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent)' }}>{formatPrice(p.sales * p.price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
