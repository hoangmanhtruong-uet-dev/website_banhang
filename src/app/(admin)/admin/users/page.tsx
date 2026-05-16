'use client';
import { useState, useEffect } from 'react';
import { useToastStore } from '@/components/ui/Toast';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (Array.isArray(data)) setUsers(data);
    } catch {
      addToast('Lỗi khi lấy dữ liệu người dùng.');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        addToast(`Đã chuyển vai trò thành ${newRole.toUpperCase()} ✨`);
        fetchUsers();
      } else {
        addToast('Lỗi khi cập nhật vai trò.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Người Dùng</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>Tổng cộng {users.length} tài khoản trong hệ thống.</p>
        </div>
        <button className="btn-primary" style={{ padding: '12px 24px' }}>➕ Thêm Admin mới</button>
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
            ) : users.map((u: any) => (
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
                      background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    <option value="editor">EDITOR</option>
                    <option value="sale">SALE</option>
                    <option value="warehouse">WAREHOUSE</option>
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
                    <button style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', cursor: 'pointer', fontSize: '12px' }}>Sửa</button>
                    <button style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>Khóa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
