'use client';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import SafeImage from '@/components/common/SafeImage';

const menuItems = [
  { label: 'Hồ sơ cá nhân', icon: '👤', href: '/profile', color: '#8b5cf6' },
  { label: 'Đơn hàng của tôi', icon: '📦', href: '/profile/orders', color: '#f97316' },
  { label: 'Ngân hàng', icon: '🏦', href: '/profile/bank', color: '#10b981' },
  { label: 'Địa chỉ', icon: '📍', href: '/profile/address', color: '#ef4444' },
  { label: 'Đổi mật khẩu', icon: '🔑', href: '/profile/password', color: '#f59e0b' },
  { label: 'Kho Voucher', icon: '🎟️', href: '/profile/vouchers', color: '#ee4d2d' },
  { label: 'Thông Báo', icon: '🔔', href: '/profile/notifications', color: '#ee4d2d' },
];

export default function ProfileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  useEffect(() => {
    if (searchParams.get('needSeller') === '1') {
      addToast('Bấm "Trở thành Người bán" để kích hoạt kênh seller (hoặc đăng nhập lại).');
    }
  }, [searchParams, addToast]);

  const handleRegisterSeller = () => { window.location.href = '/profile/seller-register'; };

  return (
    <div className="glass-card profile-sidebar" style={{ padding: '30px 20px', borderRadius: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Centered User Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px', width: '100%' }}>
        <div style={{ 
          width: '100px', height: '100px', borderRadius: '50%', 
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '48px', color: 'white', fontWeight: 800, margin: '0 auto 20px',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)', position: 'relative', overflow: 'hidden'
        }}>
          {user?.avatar && !avatarError
            ? <SafeImage src={user.avatar} alt={user.name || 'Avatar'} fill sizes="100px" onImageError={() => setAvatarError(true)} style={{ borderRadius: '50%', objectFit: 'cover' }} />
            : (user?.name?.charAt(0) || 'T')}
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px' }}>{user?.name}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 0 15px' }}>{user?.email}</p>
        
        {/* Seller Status */}
        {user?.isSeller ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
            <Link href="/seller" className="btn-primary" style={{ display: 'block', padding: '10px', fontSize: '14px', textDecoration: 'none', textAlign: 'center' }}>
              🏪 Kênh Người Bán
            </Link>
            <button type="button" onClick={handleRegisterSeller} className="btn-secondary" style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
              Làm mới quyền truy cập
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleRegisterSeller} className="btn-secondary" style={{ width: '100%', padding: '10px', fontSize: '14px' }}>
            🚀 Trở thành Người bán
          </button>
        )}
      </div>

      {/* Menu List */}
      <nav style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {menuItems.map((item, idx) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={idx} 
              href={item.href}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '15px', 
                padding: '14px 20px',
                borderRadius: '16px',
                textDecoration: 'none',
                background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '20px', color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.4)' }}>{item.icon}</span>
              <span style={{ 
                fontSize: '15px', 
                fontWeight: isActive ? 700 : 600, 
                color: isActive ? 'var(--accent)' : 'rgba(255,255,255,0.8)'
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
