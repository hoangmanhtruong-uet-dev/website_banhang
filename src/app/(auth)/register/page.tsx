'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const register = useAuthStore(s => s.register);
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(name, email, password, confirm);

    if (result.ok) {
      addToast('Đăng ký thành công! 🎉');
      router.push('/');
      router.refresh();
    } else {
      setError(result.error || 'Đăng ký thất bại');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ display:'flex', justifyContent:'center', paddingTop:'120px' }}>
      <div style={{ width:'100%', maxWidth:'440px' }}>
        <div style={{ textAlign:'center', marginBottom:'40px' }}>
          <span style={{ fontSize:'48px', display:'block', marginBottom:'16px' }}>✨</span>
          <h1 style={{ fontSize:'28px', fontWeight:800, marginBottom:'8px' }}>Tạo tài khoản</h1>
          <p style={{ color:'var(--text-muted)', fontSize:'14px' }}>Tham gia MTRUONG-STORE ngay hôm nay</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding:'32px' }}>
          {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:'var(--radius-md)', padding:'12px', marginBottom:'20px', fontSize:'13px', color:'#ef4444' }}>{error}</div>}
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Họ và tên</label>
            <input className="input-field" placeholder="Nguyễn Văn A" value={name} onChange={e=>setName(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Email</label>
            <input className="input-field" type="email" placeholder="you@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'16px' }}>
            <label className="input-label">Mật khẩu</label>
            <input className="input-field" type="password" placeholder="Tối thiểu 6 ký tự" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label className="input-label">Xác nhận mật khẩu</label>
            <input className="input-field" type="password" placeholder="Nhập lại mật khẩu" value={confirm} onChange={e=>setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}
            style={{ width:'100%', justifyContent:'center', padding:'14px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Đang tạo tài khoản...' : 'Đăng ký'}
          </button>
          <p style={{ textAlign:'center', marginTop:'20px', fontSize:'14px', color:'var(--text-muted)' }}>
            Đã có tài khoản? <Link href="/login" style={{ color:'var(--accent)', fontWeight:600 }}>Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
