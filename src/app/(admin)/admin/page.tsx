'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSellers: 0,
    totalProducts: 0,
    revenue: 0,
    totalOrders: 0
  });

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStats(data);
      })
      .catch(console.error);
  }, []);

  const cards = [
    { label: 'Tổng Người Dùng', val: stats.totalUsers, icon: '👥', color: '#3b82f6' },
    { label: 'Người Bán Hoạt Động', val: stats.activeSellers, icon: '🏪', color: '#8b5cf6' },
    { label: 'Sản Phẩm Trên Sàn', val: stats.totalProducts, icon: '📦', color: '#10b981' },
    { label: 'Doanh Thu Toàn Hệ Thống', val: formatPrice(stats.revenue), icon: '💰', color: '#f59e0b' },
  ];

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900, marginBottom: '10px' }}>Thống Kê Hệ Thống</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Dữ liệu tổng hợp thời gian thực của toàn bộ nền tảng.</p>
      </div>

      {/* Admin Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '25px', marginBottom: '40px' }}>
        {cards.map((c, i) => (
          <div key={i} style={{ 
            background: 'rgba(255,255,255,0.03)', 
            padding: '30px', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)',
            position: 'relative'
          }}>
            <span style={{ position: 'absolute', right: '20px', top: '20px', fontSize: '30px', opacity: 0.2 }}>{c.icon}</span>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '1px' }}>{c.label}</p>
            <h2 style={{ fontSize: '28px', fontWeight: 900, color: c.color, margin: 0 }}>{c.val}</h2>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        {/* Recent Registered Users */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '25px' }}>Người dùng mới gia nhập</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>
                <th style={{ padding: '15px', textAlign: 'left' }}>NGƯỜI DÙNG</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>VAI TRÒ</th>
                <th style={{ padding: '15px', textAlign: 'left' }}>NGÀY THAM GIA</th>
                <th style={{ padding: '15px', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: 'Hoàng Trường', email: 'truong@test.com', role: 'user', date: '10 phút trước' },
                { name: 'Admin.io', email: 'admin@system.com', role: 'admin', date: '1 giờ trước' },
                { name: 'Seller Pro', email: 'seller@mtruong.store', role: 'user (Seller)', date: '5 giờ trước' },
              ].map((u, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '15px' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{u.name}</p>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{u.email}</span>
                  </td>
                  <td style={{ padding: '15px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: '20px', background: u.role === 'admin' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255,255,255,0.05)', color: u.role === 'admin' ? '#8b5cf6' : 'white', fontSize: '10px' }}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '15px', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{u.date}</td>
                  <td style={{ padding: '15px', textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px' }}>Chi tiết</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* System Logs / Alerts */}
        <div style={{ background: 'rgba(255,255,255,0.03)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '25px' }}>Cảnh báo hệ thống</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ borderLeft: '4px solid #ef4444', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '0 12px 12px 0' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Phát hiện đăng nhập bất thường</p>
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>IP: 192.168.1.1 đã thử đăng nhập sai 5 lần.</p>
            </div>
            <div style={{ borderLeft: '4px solid #f59e0b', padding: '15px', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '0 12px 12px 0' }}>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Sao lưu dữ liệu tự động</p>
              <p style={{ margin: '5px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Hệ thống đã hoàn tất sao lưu lúc 04:00 AM.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
