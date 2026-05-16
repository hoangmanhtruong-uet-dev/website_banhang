'use client';

export default function VouchersPage() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎟️</div>
      <h2 style={{ fontSize: '20px', fontWeight: 600 }}>Kho Voucher đang trống</h2>
      <p style={{ color: 'var(--text-muted)', marginTop: '10px' }}>Săn thêm nhiều mã giảm giá tại trang chủ nhé!</p>
    </div>
  );
}
