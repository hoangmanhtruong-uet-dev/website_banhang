'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: '📊', label: 'Dashboard', href: '/admin/dashboard' },
  { icon: '📦', label: 'Sản phẩm', href: '/admin/products' },
  { icon: '📋', label: 'Đơn hàng', href: '/admin/orders' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#050505', color: '#fff' }}>
      {/* Sidebar */}
      <aside style={{ 
        width: '280px', 
        borderRight: '1px solid var(--border)', 
        padding: '32px 20px',
        position: 'fixed',
        height: '100vh',
        background: 'rgba(255, 255, 255, 0.02)'
      }}>
        <div style={{ marginBottom: '40px', padding: '0 12px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-1px' }}>
            LUXE <span style={{ color: 'var(--accent)' }}>ADMIN</span>
          </h2>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                  borderRadius: 'var(--radius-md)', textDecoration: 'none', transition: 'all 0.2s',
                  background: isActive ? 'var(--accent-gradient)' : 'transparent',
                  color: isActive ? '#000' : 'var(--text-secondary)',
                  fontWeight: isActive ? 600 : 400
                }}
              >
                <span style={{ fontSize: '20px' }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, marginLeft: '280px', padding: '40px' }}>
        {children}
      </main>
    </div>
  );
}