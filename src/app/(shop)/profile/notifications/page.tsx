'use client';

export default function NotificationsPage() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🔔</div>
      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Chưa có thông báo mới</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Chúng tôi sẽ báo cho bạn khi có tin tức mới nhất về đơn hàng hoặc khuyến mãi!</p>
    </div>
  );
}
