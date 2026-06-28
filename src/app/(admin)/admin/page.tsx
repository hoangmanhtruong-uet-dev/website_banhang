'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSellers: 0,
    totalProducts: 0,
    revenue: 0,
    totalOrders: 0
  });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(data => {
        if (data && !data.error) setStats(data);
      })
      .catch(console.error);

    fetch('/api/admin/users')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          // Lấy tối đa 5 người dùng mới nhất
          setRecentUsers(data.slice(0, 5));
        }
      })
      .catch(console.error);
  }, []);

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  };

  const getAvatar = (role: string, isSeller: boolean) => {
    if (role === 'admin') return '👑';
    if (isSeller) return '🏪';
    return '👨‍💻';
  };

  const getRoleLabel = (role: string, isSeller: boolean) => {
    if (role === 'admin') return 'ADMIN';
    if (role === 'shipper') return 'SHIPPER';
    if (isSeller) return 'SELLER';
    return role.toUpperCase();
  };

  const cards = [
    { label: 'Tổng Người Dùng', val: stats.totalUsers, icon: '👥', color: '#3b82f6' },
    { label: 'Người Bán Hoạt Động', val: stats.activeSellers, icon: '🏪', color: '#8b5cf6' },
    { label: 'Sản Phẩm Trên Sàn', val: stats.totalProducts, icon: '📦', color: '#10b981' },
    { label: 'Doanh Thu Toàn Hệ Thống', val: formatPrice(stats.revenue), icon: '💰', color: '#f59e0b' },
  ];

  return (
    <>
      <style>{`
        .admin-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%);
          backdrop-filter: blur(12px);
          padding: 32px;
          border-radius: 24px;
          border: 1px solid rgba(255,255,255,0.05);
          position: relative;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }
        .admin-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px -10px rgba(0,0,0,0.8);
          border: 1px solid rgba(255,255,255,0.15);
        }
        .admin-card::before {
          content: '';
          position: absolute;
          top: 0; left: -100%; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
          transform: skewX(-20deg);
          animation: shine 8s infinite;
        }
        @keyframes shine {
          0% { left: -100%; }
          20% { left: 200%; }
          100% { left: 200%; }
        }
        .admin-icon-bg {
          position: absolute;
          right: -10px;
          bottom: -10px;
          font-size: 80px;
          opacity: 0.05;
          transform: rotate(-15deg);
          transition: all 0.4s ease;
        }
        .admin-card:hover .admin-icon-bg {
          transform: rotate(0deg) scale(1.1);
          opacity: 0.1;
        }
        .admin-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .admin-table th {
          padding: 18px 16px;
          text-align: left;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
          font-weight: 600;
        }
        .admin-table td {
          padding: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.2s ease;
        }
        .admin-table tr:hover td {
          background: rgba(255,255,255,0.02);
        }
        .btn-action {
          background: rgba(139, 92, 246, 0.1);
          color: #a78bfa;
          border: 1px solid rgba(139, 92, 246, 0.2);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s;
        }
        .btn-action:hover {
          background: rgba(139, 92, 246, 0.25);
          color: #c4b5fd;
          transform: translateY(-2px);
        }
      `}</style>
      
      <div style={{ maxWidth: '1400px', margin: '0 auto', paddingTop: '20px' }}>
        <div style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ 
              fontSize: '42px', fontWeight: 900, marginBottom: '12px', lineHeight: 1.2, 
              background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
            }}>
              Thống Kê Hệ Thống
            </h1>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '15px' }}>Dữ liệu tổng hợp thời gian thực của toàn bộ nền tảng.</p>
          </div>
          <div style={{ 
            padding: '10px 20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', 
            borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '8px' 
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
            <span style={{ color: '#34d399', fontSize: '13px', fontWeight: 600, letterSpacing: '0.5px' }}>HỆ THỐNG ONLINE</span>
          </div>
        </div>

        {/* Admin Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
          {cards.map((c, i) => (
            <div key={i} className="admin-card">
              <span className="admin-icon-bg">{c.icon}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  {c.icon}
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0, fontWeight: 600 }}>{c.label}</p>
              </div>
              <h2 style={{ fontSize: '32px', fontWeight: 900, color: '#fff', margin: 0 }}>{c.val}</h2>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
          {/* Recent Registered Users */}
          <div className="admin-card" style={{ padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Người dùng mới gia nhập</h3>
              <span 
                onClick={() => router.push('/admin/users')}
                style={{ fontSize: '13px', color: '#8b5cf6', cursor: 'pointer', fontWeight: 600 }}
              >
                Xem tất cả →
              </span>
            </div>
            
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người Dùng</th>
                  <th>Vai Trò</th>
                  <th>Ngày Tham Gia</th>
                  <th style={{ textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u, i) => (
                  <tr key={u.id || i}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                          {getAvatar(u.role, u.isSeller)}
                        </div>
                        <div>
                          <p style={{ margin: 0, fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>{u.name}</p>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 10px', borderRadius: '20px', 
                        background: u.role === 'admin' ? 'rgba(139, 92, 246, 0.15)' : (u.isSeller ? 'rgba(245, 158, 11, 0.15)' : 'rgba(255,255,255,0.05)'), 
                        color: u.role === 'admin' ? '#c4b5fd' : (u.isSeller ? '#fcd34d' : '#cbd5e1'), 
                        fontSize: '11px', fontWeight: 600
                      }}>
                        {getRoleLabel(u.role, u.isSeller)}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>
                      {formatRelativeTime(u.createdAt)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => router.push(`/admin/users?id=${u.id}`)}
                        className="btn-action"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
                {recentUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                      Không có người dùng mới.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* System Logs / Alerts */}
          <div className="admin-card" style={{ padding: '32px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Cảnh báo hệ thống</span>
            </h3>
            
            <div style={{ 
              display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', 
              justifyContent: 'center', padding: '60px 0', background: 'rgba(16, 185, 129, 0.05)',
              borderRadius: '16px', border: '1px dashed rgba(16, 185, 129, 0.2)'
            }}>
              <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
              }}>
                🛡️
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#34d399', fontSize: '16px', fontWeight: 700, margin: '0 0 4px 0' }}>Hệ thống ổn định</p>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: 0 }}>Không có cảnh báo mới cần xử lý.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
