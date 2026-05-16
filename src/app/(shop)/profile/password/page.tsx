'use client';
import { useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';

export default function PasswordPage() {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmPassword) {
      return addToast('Mật khẩu xác nhận không khớp! ❌');
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        addToast('Đổi mật khẩu thành công! 🔑');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        addToast(data.error || 'Có lỗi xảy ra.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
    setLoading(false);
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Đổi Mật Khẩu</h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>Để bảo mật tài khoản, vui lòng không chia sẻ mật khẩu cho người khác</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Mật khẩu hiện tại</label>
          <input 
            type="password" 
            required 
            className="input-field" 
            value={formData.currentPassword} 
            onChange={e => setFormData({...formData, currentPassword: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Mật khẩu mới</label>
          <input 
            type="password" 
            required 
            className="input-field" 
            value={formData.newPassword} 
            onChange={e => setFormData({...formData, newPassword: e.target.value})} 
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Xác nhận mật khẩu mới</label>
          <input 
            type="password" 
            required 
            className="input-field" 
            value={formData.confirmPassword} 
            onChange={e => setFormData({...formData, confirmPassword: e.target.value})} 
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '10px', padding: '12px' }}>
          {loading ? 'Đang xử lý...' : 'Xác nhận'}
        </button>
      </form>
    </div>
  );
}
