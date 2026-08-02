'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const adminMenu = [
  { label: 'Tổng quan hệ thống', icon: '🖥️', href: '/admin' },
  { label: 'Sản phẩm & Danh mục', icon: '📦', href: '/admin/products' },
  { label: 'Quản lý kho hàng', icon: '🏭', href: '/admin/inventory' },
  { label: 'Đơn hàng & Vận chuyển', icon: '📝', href: '/admin/orders' },
  { label: 'Khách hàng & Phân quyền', icon: '👥', href: '/admin/users' },
  { label: 'Duyệt Seller & Payout', icon: '✅', href: '/admin/sellers' },
  { label: 'Marketing & Voucher', icon: '🎟️', href: '/admin/marketing' },
  { label: 'Analytics kinh doanh', icon: '📊', href: '/admin/analytics' },
  { label: 'Monitoring', icon: '🩺', href: '/admin/monitoring' },
  { label: 'Audit log', icon: '🔍', href: '/admin/audit' },
  { label: 'Cấu hình hệ thống', icon: '⚙️', href: '/admin/settings' },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return <aside style={{ width: 280, background: '#0f172a', height: '100vh', position: 'fixed', inset: '0 auto 0 0', padding: '26px 20px', borderRight: '1px solid rgba(255,255,255,.05)', zIndex: 100, overflowY: 'auto' }}>
    <div style={{ marginBottom: 20, padding: '0 15px' }}>
      <h2 style={{ fontSize: 24, fontWeight: 900, color: 'white', letterSpacing: -1, margin: 0 }}>ADMIN<span style={{ color: 'var(--accent)' }}>.IO</span></h2>
      <p style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', letterSpacing: 1 }}>Hệ thống quản trị</p>
      <Link href="/" style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', color: 'white', textDecoration: 'none', fontSize: 13 }}>🏠 Về cửa hàng</Link>
    </div>
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingBottom: 20 }}>
      {adminMenu.map((item) => {
        const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href + '/'));
        return <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '12px 16px', borderRadius: 12, textDecoration: 'none', background: active ? 'var(--accent-gradient)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,.65)', fontWeight: active ? 700 : 500 }}>
          <span style={{ fontSize: 18 }}>{item.icon}</span><span style={{ fontSize: 13 }}>{item.label}</span>
        </Link>;
      })}
    </nav>
  </aside>;
}
