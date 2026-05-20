'use client';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const itemCount = useCartStore(s => s.getItemCount());
  const { isAuthenticated, isLoading, user, logout, fetchMe } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const [menuOpen, setMenuOpen] = useState(false);

  // Khôi phục session từ HTTP-only cookie khi app load
  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/seller')) return null;

  return (
    <nav className="navbar">
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <span style={{ fontSize:'24px' }}>💎</span>
        <span style={{ fontSize:'18px', fontWeight:700, background:'var(--accent-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
          MTRUONG-STORE
        </span>
      </Link>

      <div style={{ display:'flex', alignItems:'center', gap:'32px' }} className="nav-links-desktop">
        <Link href="/products" style={{ fontSize:'14px', color:'var(--text-secondary)', transition:'color 0.2s' }}
          onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--accent)'}
          onMouseLeave={e=>(e.target as HTMLElement).style.color='var(--text-secondary)'}>
          Sản phẩm
        </Link>
        {isAdmin && (
          <Link href="/admin" style={{ fontSize:'14px', color:'var(--text-secondary)', transition:'color 0.2s' }}
            onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--accent)'}
            onMouseLeave={e=>(e.target as HTMLElement).style.color='var(--text-secondary)'}>
            Quản trị
          </Link>
        )}
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
        <Link href="/cart" style={{ position:'relative' }} className="btn-icon">
          <span>🛒</span>
          {itemCount > 0 && (
            <span style={{
              position:'absolute', top:'-4px', right:'-4px',
              background:'var(--accent-gradient)', color:'#000',
              fontSize:'11px', fontWeight:700, width:'20px', height:'20px',
              borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
            }}>{itemCount}</span>
          )}
        </Link>

        {isLoading ? (
          <div style={{ width:'80px', height:'36px', background:'rgba(255,255,255,0.05)', borderRadius:'var(--radius-md)', animation:'pulse 1.5s infinite' }} />
        ) : isAuthenticated ? (
          <div style={{ position:'relative' }}>
            <button className="btn-icon" onClick={() => setMenuOpen(!menuOpen)}
              style={{ fontSize:'14px', fontWeight:600, width:'auto', borderRadius:'var(--radius-md)', padding:'8px 16px', gap:'8px', display:'flex' }}>
              <span>👤</span>
              <span style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{user?.name}</span>
            </button>
            {menuOpen && (
              <div style={{
                position:'absolute', top:'48px', right:0,
                background:'var(--bg-card)', border:'1px solid var(--border)',
                borderRadius:'var(--radius-md)', padding:'8px', minWidth:'160px',
                boxShadow:'0 8px 32px rgba(0,0,0,0.4)', zIndex:10,
              }}>
                <Link href="/profile" onClick={() => setMenuOpen(false)}
                  style={{
                    display:'block', width:'100%', padding:'10px 16px', color:'var(--text-secondary)',
                    textDecoration:'none', fontSize:'14px', borderRadius:'var(--radius-sm)',
                    transition:'background 0.2s',
                  }}
                  onMouseEnter={e=>(e.target as HTMLElement).style.background='rgba(255,255,255,0.05)'}
                  onMouseLeave={e=>(e.target as HTMLElement).style.background='transparent'}>
                  👤 Hồ sơ của tôi
                </Link>
                <div style={{ height:'1px', background:'var(--border)', margin:'4px 0' }} />
                <button onClick={() => { logout(); setMenuOpen(false); }}
                  style={{
                    width:'100%', padding:'10px 16px', background:'transparent',
                    border:'none', color:'var(--danger)', cursor:'pointer',
                    borderRadius:'var(--radius-sm)', fontSize:'14px', textAlign:'left',
                    transition:'background 0.2s',
                  }}
                  onMouseEnter={e=>(e.target as HTMLElement).style.background='rgba(239,68,68,0.1)'}
                  onMouseLeave={e=>(e.target as HTMLElement).style.background='transparent'}>
                  🚪 Đăng xuất
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/login" className="btn-primary btn-sm">Đăng nhập</Link>
        )}
      </div>
    </nav>
  );
}
