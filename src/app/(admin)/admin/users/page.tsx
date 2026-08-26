'use client';
import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';

type AdminUser = {
  id: string;
  code: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  isSeller: boolean;
  phone?: string | null;
  gender?: string | null;
  birthday?: string | null;
  licensePlate?: string | null;
  transportType?: string | null;
  createdAt: string;
  updatedAt: string;
};

function AdminUsersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'admin' });
  const addToast = useToastStore(s => s.addToast);

  const fetchUsers = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUsers(data);
        return data as AdminUser[];
      }
    } catch {
      addToast('Lỗi khi lấy dữ liệu người dùng.');
    } finally {
      if (!silent) setLoading(false);
    }
    return [];
  }, [addToast]);

  const openDetail = useCallback((user: AdminUser) => {
    setDetailUser(user);
    setShowDetailModal(true);
    router.replace(`/admin/users?id=${user.id}`, { scroll: false });
  }, [router]);

  const closeDetail = useCallback(() => {
    setShowDetailModal(false);
    setDetailUser(null);
    router.replace('/admin/users', { scroll: false });
  }, [router]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    const userId = searchParams.get('id');
    if (!userId || users.length === 0) return;
    const user = users.find(u => u.id === userId);
    if (user) {
      setDetailUser(user);
      setShowDetailModal(true);
    }
  }, [searchParams, users]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        addToast(`Đã chuyển vai trò thành ${newRole.toUpperCase()} ✨`);
        const list = await fetchUsers(true);
        if (detailUser?.id === userId) {
          const updated = list.find(u => u.id === userId);
          if (updated) setDetailUser(updated);
        }
      } else {
        addToast('Lỗi khi cập nhật vai trò.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const handleToggleActive = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-active`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message);
        const list = await fetchUsers(true);
        if (detailUser?.id === userId) {
          const updated = list.find(u => u.id === userId);
          if (updated) setDetailUser(updated);
        }
      } else {
        addToast(data.error || 'Lỗi xử lý.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : `/api/admin/users`;
      const res = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        addToast(editingUser ? 'Cập nhật thành công! ✨' : 'Thêm Admin mới thành công! ✨');
        setShowModal(false);
        const list = await fetchUsers(true);
        if (detailUser && editingUser?.id === detailUser.id) {
          const updated = list.find(u => u.id === detailUser.id);
          if (updated) setDetailUser(updated);
        }
      } else {
        const d = await res.json();
        addToast(typeof d.error === 'string' ? d.error : d.error?.message || 'Thao tác thất bại.', 'error');
      }
    } catch { addToast('Lỗi kết nối.'); }
  };

  const openEditFromDetail = (u: AdminUser) => {
    setEditingUser(u);
    setFormData({ name: u.name, email: u.email, password: '', role: u.role });
    setShowModal(true);
  };

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleString('vi-VN');
  };

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Người Dùng</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Tổng cộng {users.length} tài khoản trong hệ thống.</p>
        </div>
        <button
          className="btn-primary"
          style={{ padding: '12px 24px' }}
          onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'admin' }); setShowModal(true); }}
        >➕ Thêm Admin mới</button>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>NGƯỜI DÙNG</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>EMAIL</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>VAI TRÒ</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>NGƯỜI BÁN</th>
              <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <span style={{ fontWeight: 700 }}>{u.name}</span>
                  </div>
                </td>
                <td style={{ padding: '20px', color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>{u.email}</td>
                <td style={{ padding: '20px' }}>
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    style={{
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    <option value="editor">EDITOR</option>
                    <option value="sale">SALE</option>
                    <option value="warehouse">WAREHOUSE</option>
                    <option value="shipper">SHIPPER</option>
                  </select>
                </td>
                <td style={{ padding: '20px' }}>
                  {u.isSeller ? (
                    <span style={{ color: '#10b981', fontSize: '13px' }}>✅ Có</span>
                  ) : (
                    <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>Chưa</span>
                  )}
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.3)', color: '#c4b5fd', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                      onClick={() => openDetail(u)}
                    >Chi tiết</button>
                    <button
                      type="button"
                      style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px' }}
                      onClick={() => {
                        setEditingUser(u);
                        setFormData({ name: u.name, email: u.email, password: '', role: u.role });
                        setShowModal(true);
                      }}
                    >Sửa</button>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontSize: '12px',
                        background: u.isActive === false ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        color: u.isActive === false ? '#10b981' : '#ef4444',
                      }}
                      onClick={() => handleToggleActive(u.id)}
                    >
                      {u.isActive === false ? 'Mở khóa' : 'Khóa'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetailModal && detailUser && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Chi tiết người dùng</h2>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>Mã: {detailUser.code}</p>
              </div>
              <button type="button" onClick={closeDetail} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginBottom: '24px' }}>
              {[
                { label: 'Họ tên', value: detailUser.name },
                { label: 'Email', value: detailUser.email },
                { label: 'Số điện thoại', value: detailUser.phone || '—' },
                { label: 'Vai trò', value: detailUser.role.toUpperCase() },
                { label: 'Người bán', value: detailUser.isSeller ? 'Có' : 'Chưa' },
                { label: 'Trạng thái', value: detailUser.isActive !== false ? 'Hoạt động' : 'Đã khóa' },
                { label: 'Giới tính', value: detailUser.gender || '—' },
                { label: 'Ngày sinh', value: detailUser.birthday ? formatDate(detailUser.birthday) : '—' },
                ...(detailUser.role === 'shipper' ? [
                  { label: 'Biển số xe', value: detailUser.licensePlate || '—' },
                  { label: 'Phương tiện', value: detailUser.transportType || '—' },
                ] : []),
                { label: 'Ngày tham gia', value: formatDate(detailUser.createdAt) },
                { label: 'Cập nhật lần cuối', value: formatDate(detailUser.updatedAt) },
              ].map(row => (
                <div key={row.label} style={{ padding: '12px 14px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{row.label}</p>
                  <p style={{ margin: '6px 0 0', fontWeight: 600 }}>{row.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-primary" style={{ flex: 1, minWidth: '120px' }} onClick={() => openEditFromDetail(detailUser)}>
                Sửa thông tin
              </button>
              <button
                type="button"
                style={{
                  flex: 1, minWidth: '120px', padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 600,
                  background: detailUser.isActive === false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: detailUser.isActive === false ? '#10b981' : '#ef4444',
                }}
                onClick={() => handleToggleActive(detailUser.id)}
              >
                {detailUser.isActive === false ? 'Mở khóa' : 'Khóa tài khoản'}
              </button>
              <button type="button" className="btn-secondary" style={{ flex: 1, minWidth: '120px' }} onClick={closeDetail}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001 }}>
          <form onSubmit={handleSaveUser} className="glass-card" style={{ padding: '32px', width: '100%', maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '24px' }}>{editingUser ? 'Sửa Người Dùng' : 'Thêm Admin Mới'}</h2>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Tên</label>
              <input className="input-field" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Email</label>
              <input className="input-field" type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} required />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Mật khẩu {editingUser && '(để trống nếu không đổi)'}</label>
              <input className="input-field" type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} required={!editingUser} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px' }}>Vai trò</label>
              <select className="input-field" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                {['user', 'admin', 'editor', 'sale', 'warehouse', 'shipper'].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Hủy</button>
              <button type="submit" className="btn-primary">Lưu</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div style={{ padding: '50px', textAlign: 'center' }}>Đang tải...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
