'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';

export default function SellerDashboard() {
  const [stats, setStats] = useState({
    totalSales: 15800000,
    orders: 42,
    rating: 4.9,
    products: 12
  });
  const user = useAuthStore(s => s.user);

  const statCards = [
    { label: 'Tổng doanh thu', value: formatPrice(stats.totalSales), icon: '💰', color: '#10b981', trend: '+12% so với tháng trước' },
    { label: 'Số đơn hàng', value: stats.orders, icon: '📦', color: '#3b82f6', trend: '+5 đơn mới hôm nay' },
    { label: 'Đánh giá shop', value: stats.rating, icon: '⭐', color: '#f59e0b', trend: '98% khách hàng hài lòng' },
    { label: 'Sản phẩm', value: stats.products, icon: '🏷️', color: '#8b5cf6', trend: '3 sản phẩm sắp hết hàng' },
  ];

  return (
    <div>
      {/* Header Section */}
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Bảng Điều Khiển</h1>
        <p style={{ color: 'var(--text-muted)' }}>Xem tổng quan hoạt động kinh doanh của gian hàng bạn.</p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {statCards.map((stat, i) => (
          <div key={i} className="glass-card" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '15px', top: '15px', fontSize: '32px', opacity: 0.2 }}>{stat.icon}</div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 10px' }}>{stat.label}</p>
            <h2 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 10px', color: stat.color }}>{stat.value}</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
              <span style={{ color: stat.color, fontWeight: 700 }}>↑</span> {stat.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Charts & Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* Fake Growth Chart using SVG */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Tăng trưởng doanh thu</h3>
            <select style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '8px', fontSize: '12px' }}>
              <option>7 ngày qua</option>
              <option>30 ngày qua</option>
            </select>
          </div>
          <div style={{ height: '200px', width: '100%', position: 'relative' }}>
            <svg viewBox="0 0 100 20" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d="M0,15 Q10,12 20,16 T40,10 T60,14 T80,5 T100,12" fill="none" stroke="var(--accent)" strokeWidth="0.5" />
              <path d="M0,15 Q10,12 20,16 T40,10 T60,14 T80,5 T100,12 L100,20 L0,20 Z" fill="url(#grad)" opacity="0.1" />
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                </linearGradient>
              </defs>
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '10px', color: 'var(--text-muted)' }}>
              <span>Thứ 2</span><span>Thứ 3</span><span>Thứ 4</span><span>Thứ 5</span><span>Thứ 6</span><span>Thứ 7</span><span>CN</span>
            </div>
          </div>
        </div>

        {/* To-do List */}
        <div className="glass-card" style={{ padding: '30px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Việc cần làm</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <span style={{ color: '#f59e0b' }}>⚠️</span>
              <div style={{ fontSize: '13px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>5 đơn hàng chờ xử lý</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Giao trước 12:00 hôm nay</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <span style={{ color: '#ef4444' }}>📉</span>
              <div style={{ fontSize: '13px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>3 sản phẩm hết hàng</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Cập nhật ngay để tăng doanh số</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
              <span style={{ color: '#10b981' }}>💬</span>
              <div style={{ fontSize: '13px' }}>
                <p style={{ margin: 0, fontWeight: 600 }}>2 tin nhắn mới</p>
                <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>Khách hàng đang chờ phản hồi</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity / Quick Actions */}
      <div className="glass-card" style={{ padding: '30px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Thao tác nhanh</h3>
        <div style={{ display: 'flex', gap: '20px' }}>
          <Link href="/seller/products/new" className="btn-secondary" style={{ flex: 1, padding: '15px', textDecoration: 'none', textAlign: 'center' }}>
            ➕ Đăng sản phẩm
          </Link>
          <Link href="/seller/marketing" className="btn-secondary" style={{ flex: 1, padding: '15px', textDecoration: 'none', textAlign: 'center' }}>
            🎟️ Tạo Voucher
          </Link>
          <Link href="/seller/shop-profile" className="btn-secondary" style={{ flex: 1, padding: '15px', textDecoration: 'none', textAlign: 'center' }}>
            🏪 Sửa hồ sơ shop
          </Link>
        </div>
      </div>
    </div>
  );
}
