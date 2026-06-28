'use client';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname();
  
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/seller') || pathname?.startsWith('/shipper')) return null;

  return (
    <footer style={{
      background:'var(--bg-secondary)', borderTop:'1px solid var(--border)',
      padding:'48px 32px 24px', marginTop:'64px',
    }}>
      <div style={{ maxWidth:'1280px', margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:'40px' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
            <span style={{ fontSize:'24px' }}>💎</span>
            <span style={{ fontSize:'18px', fontWeight:700, background:'var(--accent-gradient)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>MTRUONG-STORE</span>
          </div>
          <p style={{ fontSize:'14px', color:'var(--text-muted)', lineHeight:'1.8' }}>
            Cửa hàng mua sắm trực tuyến cao cấp.<br/>Chất lượng vượt trội, phong cách đỉnh cao.
          </p>
        </div>
        <div>
          <h4 style={{ fontSize:'14px', fontWeight:600, color:'var(--text-primary)', marginBottom:'16px', textTransform:'uppercase', letterSpacing:'1px' }}>Danh mục</h4>
          {['Thời trang','Công nghệ','Làm đẹp','Gia dụng'].map(c => (
            <p key={c} style={{ fontSize:'14px', color:'var(--text-muted)', padding:'6px 0', cursor:'pointer', transition:'color 0.2s' }}
              onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--accent)'}
              onMouseLeave={e=>(e.target as HTMLElement).style.color='var(--text-muted)'}>{c}</p>
          ))}
        </div>
        <div>
          <h4 style={{ fontSize:'14px', fontWeight:600, color:'var(--text-primary)', marginBottom:'16px', textTransform:'uppercase', letterSpacing:'1px' }}>Hỗ trợ</h4>
          {['Chính sách đổi trả','Hướng dẫn mua hàng','Vận chuyển','Liên hệ'].map(c => (
            <p key={c} style={{ fontSize:'14px', color:'var(--text-muted)', padding:'6px 0', cursor:'pointer', transition:'color 0.2s' }}
              onMouseEnter={e=>(e.target as HTMLElement).style.color='var(--accent)'}
              onMouseLeave={e=>(e.target as HTMLElement).style.color='var(--text-muted)'}>{c}</p>
          ))}
        </div>
        <div>
          <h4 style={{ fontSize:'14px', fontWeight:600, color:'var(--text-primary)', marginBottom:'16px', textTransform:'uppercase', letterSpacing:'1px' }}>Liên hệ</h4>
          <p style={{ fontSize:'14px', color:'var(--text-muted)', padding:'6px 0' }}>📧 support@luxestore.vn</p>
          <p style={{ fontSize:'14px', color:'var(--text-muted)', padding:'6px 0' }}>📞 1900 1234 56</p>
          <p style={{ fontSize:'14px', color:'var(--text-muted)', padding:'6px 0' }}>📍 TP. Hồ Chí Minh, Việt Nam</p>
        </div>
      </div>
      <div style={{ maxWidth:'1280px', margin:'40px auto 0', paddingTop:'24px', borderTop:'1px solid var(--border)', textAlign:'center' }}>
        <p style={{ fontSize:'13px', color:'var(--text-muted)' }}>© 2026 MTRUONG-STORE. All rights reserved.</p>
      </div>
    </footer>
  );
}
