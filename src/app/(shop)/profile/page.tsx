'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useToastStore } from '@/components/ui/Toast';
import ProfileSidebar from '@/components/profile/ProfileSidebar';

export default function ProfilePage() {
  const user = useAuthStore(s => s.user);
  const fetchMe = useAuthStore(s => s.fetchMe);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    gender: '',
    birthday: '',
    avatar: undefined as string | undefined,
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [fileInputEl, setFileInputEl] = useState<HTMLInputElement | null>(null);

  const openFilePicker = () => {
    fileInputEl?.click();
  };
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || 'male',
        birthday: user.birthday ? new Date(user.birthday).toISOString().split('T')[0] : '',
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
      const payload = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        gender: formData.gender,
        birthday: formData.birthday ? new Date(formData.birthday).toISOString() : null,
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

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Hồ Sơ Của Tôi</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>Quản lý thông tin hồ sơ để bảo mật tài khoản</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '40px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Tên đăng nhập */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Tên đăng nhập</label>
              <p style={{ margin: 0, fontWeight: 600 }}>{user?.email?.split('@')[0]}</p>
            </div>

            {/* Tên */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Tên</label>
              <input 
                className="input-field" 
                value={formData.name} 
                onChange={e => setFormData({...formData, name: e.target.value})} 
                style={{ flex: 1, padding: '10px 15px' }}
              />
            </div>

            {/* Email */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Email</label>
              <p style={{ margin: 0 }}>{formData.email} <span style={{ color: 'var(--accent)', fontSize: '12px', cursor: 'pointer', marginLeft: '10px' }}>Thay đổi</span></p>
            </div>

            {/* Số điện thoại */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Số điện thoại</label>
              <input 
                className="input-field" 
                placeholder="Nhập số điện thoại"
                value={formData.phone} 
                onChange={e => setFormData({...formData, phone: e.target.value})} 
                style={{ flex: 1, padding: '10px 15px' }}
              />
            </div>

            {/* Giới tính */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Giới tính</label>
              <div style={{ display: 'flex', gap: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="gender" value="male" checked={formData.gender === 'male'} onChange={e => setFormData({...formData, gender: e.target.value})} /> Nam
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="gender" value="female" checked={formData.gender === 'female'} onChange={e => setFormData({...formData, gender: e.target.value})} /> Nữ
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="radio" name="gender" value="other" checked={formData.gender === 'other'} onChange={e => setFormData({...formData, gender: e.target.value})} /> Khác
                </label>
              </div>
            </div>

            {/* Ngày sinh */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <label style={{ width: '150px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>Ngày sinh</label>
              <input 
                type="date" 
                className="input-field" 
                value={formData.birthday} 
                onChange={e => setFormData({...formData, birthday: e.target.value})} 
                style={{ flex: 1, padding: '10px 15px' }}
              />
            </div>

            <div style={{ paddingLeft: '150px', marginTop: '10px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={loading}
                style={{ padding: '12px 30px' }}
              >
                {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>

          {/* Avatar Upload Side */}
          <div style={{ width: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '40px' }}>
            <div
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '40px',
                marginBottom: '20px',
                border: '2px dashed rgba(255,255,255,0.2)',
                overflow: 'hidden',
              }}
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Ảnh đại diện mới" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : user?.avatar && !avatarLoadError ? (
                <img src={user.avatar} alt={user.name || 'Avatar'} onError={() => setAvatarLoadError(true)} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit: 'cover' }} />
              ) : (
                '👤'
              )}
            </div>

            <input
              ref={(el) => setFileInputEl(el)}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                if (file.size > 1024 * 1024) {
                  addToast('Dung lượng ảnh tối đa 1MB');
                  e.target.value = '';
                  return;
                }

                setAvatarPreview(URL.createObjectURL(file));
                setFormData((prev) => ({ ...prev, avatar: undefined }));

                (async () => {
                  try {
                    const fd = new FormData();
                    fd.append('file', file);

                    const upRes = await fetch('/api/upload', { method: 'POST', body: fd });
                    const upData = await upRes.json();

                    if (!upRes.ok) {
                      addToast('Upload ảnh thất bại');
                      return;
                    }

                    if (!upData?.url) {
                      addToast('Upload thành công nhưng không có url');
                      return;
                    }

                    setFormData((prev) => ({ ...prev, avatar: upData.url }));
                    addToast('Đã chọn ảnh thành công');
                  } catch {
                    addToast('Lỗi upload ảnh');
                  }
                })();
              }}
            />

            <button type="button" className="btn-secondary" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={openFilePicker}>
              Chọn ảnh
            </button>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '15px' }}>
              Dung lượng file tối đa 1 MB<br />Định dạng: .JPEG, .PNG
            </p>
          </div>
        </form>
      </div>
  );
}
