'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminMenu = [
  { label: 'Thống Kê Hệ Thống', icon: '🖥️', href: '/admin' },
  { label: 'Sản phẩm & Danh mục', icon: '📦', href: '/admin/products' },
  { label: 'Quản Lý Kho Hàng', icon: '🏭', href: '/admin/inventory' },
  { label: 'Đơn Hàng & Vận Chuyển', icon: '📝', href: '/admin/orders' },
  { label: 'Khách Hàng & Phân Quyền', icon: '👥', href: '/admin/users' },
  { label: 'Marketing & Voucher', icon: '🎟️', href: '/admin/marketing' },
  { label: 'Báo Cáo Doanh Thu', icon: '📊', href: '/admin/analytics' },
  { label: 'Cấu Hình Hệ Thống', icon: '⚙️', href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <div style={{ 
      width: '280px', 
      background: '#0f172a', 
      height: '100vh', 
      position: 'fixed', 
      left: 0, 
      top: 0,
      padding: '30px 20px',
      borderRight: '1px solid rgba(255,255,255,0.05)',
      zIndex: 100
    }}>
      <div style={{ marginBottom: '24px', padding: '0 15px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>
          ADMIN<span style={{ color: 'var(--accent)' }}>.IO</span>
        </h2>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '5px' }}>
          Hệ thống quản trị tối cao
        </p>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '16px',
            padding: '10px 14px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'white',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.2s ease',
          }}
        >
          🏠 Quay về trang chủ
        </Link>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {adminMenu.map((item, idx) => {
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
                borderRadius: '12px',
                textDecoration: 'none',
                background: isActive ? 'var(--accent-gradient)' : 'transparent',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.3s ease',
                fontWeight: isActive ? 700 : 500
              }}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span style={{ fontSize: '14px' }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ position: 'absolute', bottom: '30px', left: '20px', right: '20px' }}>
        <div style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: '0 0 10px' }}>Server Status</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '12px', fontWeight: 700 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></span>
            ONLINE (v2.4.0)
          </div>
        </div>
      </div>
    </div>
  );
}
