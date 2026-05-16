'use client';

export default function PurchasePage() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>📦</div>
      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Chưa có đơn hàng nào</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Hãy bắt đầu mua sắm để lấp đầy lịch sử đơn hàng của bạn!</p>
      <a href="/products" className="btn-primary" style={{ marginTop: '20px', padding: '10px 30px', textDecoration: 'none' }}>Mua sắm ngay</a>
    </div>
  );
}
