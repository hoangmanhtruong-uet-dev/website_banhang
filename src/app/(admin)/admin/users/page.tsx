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

  const formatFullTimestamp = (dateString?: string | null) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${hours}:${minutes}:${seconds} • ${day}/${month}/${year}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Đã chép Email vào bộ nhớ tạm! 📋');
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Quản Lý Người Dùng</h1>
          <p className="text-sm text-slate-400 mt-1">Tổng cộng {users.length} tài khoản trong hệ thống.</p>
        </div>
        <button
          className="px-4 py-2 bg-[#EA580C] hover:bg-[#D97706] text-white rounded-lg text-xs font-semibold shadow-lg transition-all"
          onClick={() => { setEditingUser(null); setFormData({ name: '', email: '', password: '', role: 'admin' }); setShowModal(true); }}
        >
          ➕ Thêm Admin mới
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-[#0F1728] border border-[#192740] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1A2942] text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-[#0B1220]/50">
              <th className="py-4 px-4">NGƯỜI DÙNG</th>
              <th className="py-4 px-4">EMAIL</th>
              <th className="py-4 px-4">VAI TRÒ</th>
              <th className="py-4 px-4">NGƯỜI BÁN</th>
              <th className="py-4 px-4 text-right">THAO TÁC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#15233B]">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-slate-400 text-sm">Đang tải dữ liệu...</td></tr>
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-[#131F35] transition-colors">
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-800/60 text-amber-300 font-bold flex items-center justify-center text-sm">
                      {u.name?.charAt(0) || 'U'}
                    </div>
                    <span className="font-semibold text-white text-sm">{u.name}</span>
                  </div>
                </td>
                <td className="py-4 px-4 text-slate-300 font-mono text-xs">{u.email}</td>
                <td className="py-4 px-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-[#0B1220] text-slate-200 border border-[#1E2E4A] text-xs rounded-md px-2.5 py-1 font-semibold focus:outline-none"
                  >
                    <option value="user">USER</option>
                    <option value="admin">ADMIN</option>
                    <option value="editor">EDITOR</option>
                    <option value="sale">SALE</option>
                    <option value="warehouse">WAREHOUSE</option>
                    <option value="shipper">SHIPPER</option>
                  </select>
                </td>
                <td className="py-4 px-4">
                  {u.isSeller ? (
                    <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">✅ Có</span>
                  ) : (
                    <span className="text-slate-500 text-xs">Chưa</span>
                  )}
                </td>
                <td className="py-4 px-4 text-right">
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-[#142036] hover:bg-[#1C2D4B] text-slate-300 border border-[#223554] rounded-lg text-xs font-medium transition-colors"
                      onClick={() => openDetail(u)}
                    >
                      Chi tiết
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1.5 bg-[#142036] hover:bg-[#1C2D4B] text-slate-300 border border-[#223554] rounded-lg text-xs font-medium transition-colors"
                      onClick={() => {
                        setEditingUser(u);
                        setFormData({ name: u.name, email: u.email, password: '', role: u.role });
                        setShowModal(true);
                      }}
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                        u.isActive === false
                          ? 'bg-emerald-950/50 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60'
                          : 'bg-rose-950/50 border-rose-800 text-rose-400 hover:bg-rose-900/60'
                      }`}
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

      {/* USER DETAIL MODAL (Matching User's Screenshot Design) */}
      {showDetailModal && detailUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
          <div className="bg-[#0B1322] border border-[#1C2C46] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 pb-4 flex items-start justify-between border-b border-[#142036]">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white">Chi tiết người dùng</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-950/80 border border-orange-700/60 text-orange-400 font-mono text-[11px] font-bold">
                    {detailUser.code || 'US001'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">Xem và quản lý hồ sơ định danh, quyền hạn và hoạt động tài khoản</p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={closeDetail}
                className="w-8 h-8 rounded-full bg-[#142036] hover:bg-[#1E304E] text-slate-400 hover:text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* Profile Card Banner */}
              <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-xl bg-[#EA580C] text-white font-bold text-xl flex items-center justify-center shadow-lg shadow-orange-950/40">
                      {detailUser.name?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <span
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#0E1727] ${
                        detailUser.isActive !== false ? 'bg-emerald-400' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{detailUser.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 ${
                        detailUser.isActive !== false
                          ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-400'
                          : 'bg-rose-950/80 border-rose-700/60 text-rose-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${detailUser.isActive !== false ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        <span>{detailUser.isActive !== false ? 'Hoạt động' : 'Đã khóa'}</span>
                      </span>
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{detailUser.email}</p>
                  </div>
                </div>

                {/* Right Badge: USER / SELLER */}
                <div className="px-3 py-1.5 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-400 text-xs font-bold tracking-wide flex items-center gap-1.5">
                  <span>🔒</span>
                  <span>{detailUser.role?.toUpperCase()} {detailUser.isSeller ? '/ SELLER' : ''}</span>
                </div>
              </div>

              {/* Section 1: THÔNG TIN CƠ BẢN */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <span>👤</span>
                  <span>THÔNG TIN CƠ BẢN</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Field 1: HỌ TÊN */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      <span>HỌ TÊN</span>
                      <span className="text-slate-400 lowercase font-normal">Chính chủ</span>
                    </div>
                    <div className="mt-2 text-sm font-bold text-white">{detailUser.name}</div>
                  </div>

                  {/* Field 2: EMAIL ĐĂNG KÝ */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                      <span>EMAIL ĐĂNG KÝ</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(detailUser.email)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Sao chép email"
                      >
                        ❐
                      </button>
                    </div>
                    <div className="mt-2 text-xs font-mono font-bold text-slate-200 truncate">{detailUser.email}</div>
                  </div>

                  {/* Field 3: SỐ ĐIỆN THOẠI */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">SỐ ĐIỆN THOẠI</div>
                    <div className="mt-2 text-sm font-semibold text-white flex items-center gap-1.5">
                      <span className="text-slate-400">📞</span>
                      <span>{detailUser.phone || '0900000001'}</span>
                    </div>
                  </div>

                  {/* Field 4: VAI TRÒ HỆ THỐNG */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">VAI TRÒ HỆ THỐNG</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] font-bold">
                        {detailUser.role?.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-400">
                        {detailUser.role === 'admin' ? 'Quản trị viên hệ thống' : 'Người dùng cơ bản'}
                      </span>
                    </div>
                  </div>

                  {/* Field 5: TÀI KHOẢN NGƯỜI BÁN (SELLER) */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">TÀI KHOẢN NGƯỜI BÁN (SELLER)</div>
                    <div className="mt-2 text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <span>{detailUser.isSeller ? '🟢 Đã kích hoạt gian hàng (Có)' : '⚪ Chưa đăng ký'}</span>
                    </div>
                  </div>

                  {/* Field 6: GIỚI TÍNH */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 flex flex-col justify-between">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">GIỚI TÍNH</div>
                    <div className="mt-2 text-xs text-slate-400 italic">
                      {detailUser.gender ? detailUser.gender : '— (Chưa cập nhật)'}
                    </div>
                  </div>

                  {/* Field 7: NGÀY SINH (Full width) */}
                  <div className="col-span-2 bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5">
                    <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">NGÀY SINH</div>
                    <div className="mt-2 text-xs text-slate-400 italic">
                      {detailUser.birthday ? detailUser.birthday : '— (Chưa cung cấp thông tin ngày sinh)'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: HOẠT ĐỘNG & NHẬT KÝ THỜI GIAN */}
              <div className="space-y-3">
                <div className="text-[11px] font-bold text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
                  <span>🕒</span>
                  <span>HOẠT ĐỘNG & NHẬT KÝ THỜI GIAN</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Card 1: NGÀY THAM GIA */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span>📅</span>
                      <span>NGÀY THAM GIA</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-white">
                      {formatFullTimestamp(detailUser.createdAt)}
                    </div>
                    <div className="text-[11px] text-slate-400">Đăng ký thông qua tài khoản trực tiếp</div>
                  </div>

                  {/* Card 2: CẬP NHẬT LẦN CUỐI */}
                  <div className="bg-[#0E1727] border border-[#1A2A44] rounded-xl p-3.5 space-y-1.5">
                    <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                      <span>🔄</span>
                      <span>CẬP NHẬT LẦN CUỐI</span>
                    </div>
                    <div className="text-sm font-bold font-mono text-white">
                      {formatFullTimestamp(detailUser.updatedAt)}
                    </div>
                    <div className="text-[11px] text-slate-400">Thay đổi bởi quản trị viên hệ thống</div>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 px-6 border-t border-[#142036] flex items-center justify-between bg-[#09101D]">
              <button
                type="button"
                onClick={closeDetail}
                className="px-5 py-2.5 bg-[#15233A] hover:bg-[#1E304E] text-slate-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Đóng
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleActive(detailUser.id)}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                    detailUser.isActive === false
                      ? 'bg-emerald-950/70 border-emerald-700/60 text-emerald-400 hover:bg-emerald-900/80'
                      : 'bg-[#3B0712] border-[#831843] text-rose-300 hover:bg-[#500A18]'
                  }`}
                >
                  <span>🔒</span>
                  <span>{detailUser.isActive === false ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditFromDetail(detailUser)}
                  className="px-4 py-2.5 bg-[#EA580C] hover:bg-[#D97706] text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-orange-950/30 transition-all"
                >
                  <span>📝</span>
                  <span>Sửa thông tin</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT/CREATE USER MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSaveUser} className="bg-[#0B1322] border border-[#1C2C46] rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold text-white">{editingUser ? 'Sửa Người Dùng' : 'Thêm Admin Mới'}</h2>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tên</label>
              <input
                className="w-full px-3.5 py-2 bg-[#0E1727] border border-[#1C2C46] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Email</label>
              <input
                className="w-full px-3.5 py-2 bg-[#0E1727] border border-[#1C2C46] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Mật khẩu {editingUser && '(để trống nếu không đổi)'}</label>
              <input
                className="w-full px-3.5 py-2 bg-[#0E1727] border border-[#1C2C46] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                required={!editingUser}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Vai trò</label>
              <select
                className="w-full px-3.5 py-2 bg-[#0E1727] border border-[#1C2C46] rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
              >
                {['user', 'admin', 'editor', 'sale', 'warehouse', 'shipper'].map(r => <option key={r} value={r}>{r.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-[#15233A] hover:bg-[#1E304E] text-slate-300 rounded-lg text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#D97706] text-white font-semibold rounded-lg text-xs"
              >
                Lưu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-400">Đang tải...</div>}>
      <AdminUsersContent />
    </Suspense>
  );
}
