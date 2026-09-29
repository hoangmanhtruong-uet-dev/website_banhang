'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Đang xác thực email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Không tìm thấy mã xác thực.');
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        
        if (res.ok) {
          setStatus('success');
          setMessage('Xác thực email thành công! Bạn có thể tiếp tục sử dụng dịch vụ.');
          setTimeout(() => {
            router.push('/profile');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Mã xác thực không hợp lệ hoặc đã hết hạn.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Đã xảy ra lỗi khi xác thực email.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
        <h1 className="auth-title">Xác thực Email</h1>
        
        <div style={{ margin: '30px 0', fontSize: '16px' }}>
          {status === 'loading' && (
            <div style={{ color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 15px', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              {message}
            </div>
          )}
          
          {status === 'success' && (
            <div style={{ color: '#10b981' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>✅</div>
              <p style={{ fontWeight: 600 }}>{message}</p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '10px' }}>Đang chuyển hướng về trang Hồ sơ...</p>
            </div>
          )}
          
          {status === 'error' && (
            <div style={{ color: '#ef4444' }}>
              <div style={{ fontSize: '48px', marginBottom: '15px' }}>❌</div>
              <p style={{ fontWeight: 600 }}>{message}</p>
            </div>
          )}
        </div>

        <Link href="/" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '10px' }}>
          Về trang chủ
        </Link>
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}
