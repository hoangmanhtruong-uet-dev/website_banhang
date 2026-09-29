'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import SafeImage from '@/components/common/SafeImage';
import { FiLock, FiShield, FiCheckCircle } from 'react-icons/fi';

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const fetchMe = useAuthStore(s => s.fetchMe);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: 'male',
    bDay: '29',
    bMonth: '09',
    bYear: '1998',
    avatar: undefined as string | undefined,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      let d = '29', m = '09', y = '1998';
      if (user.birthday) {
        const date = new Date(user.birthday);
        d = String(date.getDate()).padStart(2, '0');
        m = String(date.getMonth() + 1).padStart(2, '0');
        y = String(date.getFullYear());
      }
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'male',
        bDay: d,
        bMonth: m,
        bYear: y,
        avatar: user.avatar,
      });
      setAvatarPreview(null);
      setAvatarLoadError(false);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const birthday = new Date(`${formData.bYear}-${formData.bMonth}-${formData.bDay}`).toISOString();
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birthday,
        ...(formData.avatar ? { avatar: formData.avatar } : {}),
      };

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast('Cập nhật hồ sơ thành công! ✨');
        await fetchMe();
      } else {
        addToast('Có lỗi xảy ra khi cập nhật.');
      }
    } catch {
      addToast('Lỗi kết nối server.');
    }
    setLoading(false);
  };

  const username = user?.email?.split('@')[0] || 'user';
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : username.slice(0, 2).toUpperCase();

  return (
    <div className="glass-card" style={{ borderRadius: '24px', padding: '32px', position: 'relative' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '24px', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0 }}>Hồ Sơ Của Tôi</h1>
            <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Đã kích hoạt</span>
          </div>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: 0 }}>Quản lý thông tin hồ sơ để tăng cường bảo mật cho tài khoản của bạn</p>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mức độ bảo mật</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ef4444' }}>Cao (85%)</div>
          </div>
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
            <FiLock size={18} />
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }}>
        
        {/* Left Column: Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Tên đăng nhập</label>
            <div style={{ position: 'relative' }}>
              <input disabled className="input-field" value={`@ ${username}`} style={{ background: 'rgba(0,0,0,0.2)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>(Không thể thay đổi)</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Tên hiển thị</label>
            <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Email</label>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '14px', color: '#fff' }}>{formData.email}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                  <FiCheckCircle /> Đã xác thực
                </span>
              </div>
              <span style={{ color: '#ef4444', fontSize: '13px', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Thay đổi</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Số điện thoại</label>
            <div style={{ display: 'flex', gap: '12px' }}>
              <input className="input-field" placeholder="0908 688 888" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={{ flex: 1 }} />
              <button type="button" className="btn-secondary" style={{ padding: '0 20px', borderRadius: '12px', whiteSpace: 'nowrap' }}>Cập nhật</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Giới tính</label>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['male', 'female', 'other'].map(val => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                  <input type="radio" name="gender" value={val} checked={formData.gender === val} onChange={e => setFormData({...formData, gender: e.target.value})} style={{ accentColor: 'var(--accent)', width: '16px', height: '16px' }} />
                  {val === 'male' ? 'Nam' : val === 'female' ? 'Nữ' : 'Khác'}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', alignItems: 'center', gap: '16px' }}>
            <label style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Ngày sinh</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <select className="input-field" value={formData.bDay} onChange={e => setFormData({...formData, bDay: e.target.value})}>
                {Array.from({length: 31}, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>{String(i+1).padStart(2, '0')}</option>)}
              </select>
              <select className="input-field" value={formData.bMonth} onChange={e => setFormData({...formData, bMonth: e.target.value})}>
                {Array.from({length: 12}, (_, i) => <option key={i+1} value={String(i+1).padStart(2, '0')}>Tháng {String(i+1).padStart(2, '0')}</option>)}
              </select>
              <select className="input-field" value={formData.bYear} onChange={e => setFormData({...formData, bYear: e.target.value})}>
                {Array.from({length: 100}, (_, i) => <option key={i} value={2026 - i}>{2026 - i}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '16px', marginTop: '16px' }}>
            <div />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'fit-content', padding: '14px 32px', borderRadius: '12px', fontWeight: 700, boxShadow: '0 8px 20px rgba(249, 115, 22, 0.3)' }}>
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>

        </div>

        {/* Right Column: Avatar & 2FA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)', paddingLeft: '40px' }}>
          
          {/* Avatar Ring */}
          <div style={{ 
            width: '120px', height: '120px', borderRadius: '50%', padding: '4px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)', marginBottom: '24px',
            boxShadow: '0 10px 25px rgba(249, 115, 22, 0.2)'
          }}>
            <div style={{ 
              width: '100%', height: '100%', borderRadius: '50%', background: '#111', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative'
            }}>
              {avatarPreview ? (
                <SafeImage src={avatarPreview} alt="Preview" fill sizes="120px" style={{ objectFit: 'cover' }} />
              ) : user?.avatar && !avatarLoadError ? (
                <SafeImage src={user.avatar} alt="Avatar" fill sizes="120px" onImageError={() => setAvatarLoadError(true)} style={{ objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--accent)' }}>{initials}</span>
              )}
            </div>
          </div>

          <input ref={(el) => setFileInputEl(el)} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1024 * 1024) {
                addToast('Dung lượng ảnh tối đa 1MB', 'error');
                e.target.value = '';
                return;
              }
              setAvatarPreview(URL.createObjectURL(file));
              setFormData((prev) => ({ ...prev, avatar: undefined }));
              (async () => {
                try {
                  setUploadingAvatar(true);
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('purpose', 'avatar');
                  const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
                  const upData = await upRes.json().catch(() => ({}));
                  if (!upRes.ok) {
                    addToast(upData.error || 'Upload ảnh thất bại', 'error');
                    setAvatarPreview(null);
                    return;
                  }
                  if (!upData?.url) {
                    addToast('Upload thành công nhưng không tìm thấy URL', 'error');
                    setAvatarPreview(null);
                    return;
                  }
                  setFormData((prev) => ({ ...prev, avatar: upData.url }));
                  setAvatarPreview(upData.url);
                  setAvatarLoadError(false);
                  addToast('Đã chọn ảnh thành công');
                } catch {
                  addToast('Lỗi kết nối server khi upload ảnh', 'error');
                  setAvatarPreview(null);
                } finally {
                  setUploadingAvatar(false);
                  if (e.target) e.target.value = '';
                }
              })();
            }}
          />

          <button type="button" className="btn-secondary" disabled={uploadingAvatar} onClick={() => fileInputEl?.click()} style={{ padding: '10px 24px', borderRadius: '24px', fontSize: '13px', fontWeight: 600, opacity: uploadingAvatar ? 0.7 : 1, marginBottom: '16px' }}>
            {uploadingAvatar ? 'Đang tải...' : 'Chọn ảnh'}
          </button>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 32px 0' }}>
            Dung lượng file tối đa <strong>1 MB</strong>.<br />Định dạng: .JPEG, .PNG, .WEBP
          </p>

          {/* 2FA Card */}
          <div style={{ width: '100%', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FiShield size={16} />
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>Xác thực 2 lớp (2FA)</div>
                <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 600, marginTop: '2px' }}>Đang bảo vệ</div>
              </div>
            </div>
            <button style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>
              Cài đặt
            </button>
          </div>

        </div>

      </form>
    </div>
  );
}
