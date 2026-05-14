'use client';
import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

interface Order {
  id: string;
  status: string;
  total: number;
  createdAt: string;
  customerName: string;
}

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  recentOrders: Order[];
}

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý', processing: 'Đang xử lý',
  shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const statCards = stats ? [
    { icon: '💰', label: 'Doanh thu', value: formatPrice(stats.totalRevenue), color: '#f59e0b' },
    { icon: '📦', label: 'Sản phẩm', value: stats.totalProducts.toString(), color: '#3b82f6' },
    { icon: '📋', label: 'Đơn hàng', value: stats.totalOrders.toString(), color: '#a855f7' },
    { icon: '👥', label: 'Người dùng', value: stats.totalUsers.toString(), color: '#ec4899' },
    { icon: '⏳', label: 'Chờ xử lý', value: (stats.ordersByStatus['pending'] ?? 0).toString(), color: '#eab308' },
    { icon: '✅', label: 'Hoàn thành', value: (stats.ordersByStatus['delivered'] ?? 0).toString(), color: '#22c55e' },
  ] : [];

  return (
    <div>
      <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Dashboard</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '14px' }}>Tổng quan cửa hàng của bạn</p>

      {/* Stats Grid */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: '40px' }}>
        {loading ? [...Array(6)].map((_, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', height: '100px', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
        )) : statCards.map((s, i) => (
          <div key={s.label} className="glass-card" style={{ padding: '24px', animation: `fadeInUp 0.5s ease-out ${i * 0.08}s forwards`, opacity: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '28px' }}>{s.icon}</span>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
            </div>
            <p style={{ fontSize: '28px', fontWeight: 800, marginBottom: '4px' }}>{s.value}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Đơn hàng gần đây</h2>
        <Link href="/admin/orders" style={{ fontSize: '13px', color: 'var(--accent)' }}>Xem tất cả →</Link>
      </div>
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th><th>Ngày tạo</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : stats?.recentOrders.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Chưa có đơn hàng nào</td></tr>
            ) : stats?.recentOrders.map(o => (
              <tr key={o.id}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px' }}>{o.id.slice(0, 8)}...</td>
                <td>{o.customerName}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatPrice(o.total)}</td>
                <td><span className={`status status-${o.status}`}>{statusLabel[o.status] ?? o.status}</span></td>
                <td style={{ fontSize: '13px' }}>{new Date(o.createdAt).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
