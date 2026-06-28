'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToastStore } from '@/components/ui/Toast';

interface Address {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    province: '',
    district: '',
    ward: '',
    detailAddress: '',
  });

  const fetchAddresses = async () => {
    try {
      const res = await fetch('/api/user/addresses');
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setAddresses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAddresses(); }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        addToast('Thêm địa chỉ mới thành công! 📍');
        setShowModal(false);
        setFormData({ fullName: '', phone: '', province: '', district: '', ward: '', detailAddress: '' });
        fetchAddresses();
      }
    } catch (err) {
      addToast('Lỗi khi thêm địa chỉ.');
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      await fetch('/api/user/addresses/' + id, { method: 'DELETE' });
      addToast('Đã xóa địa chỉ.');
      fetchAddresses();
    } catch (err) {
      addToast('Lỗi khi xóa.');
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Địa Chỉ Của Tôi</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>Quản lý địa chỉ nhận hàng của bạn</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          ➕ Thêm địa chỉ mới
        </button>
      </div>

      {authError ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <p>Phiên đăng nhập đã hết hạn.</p>
          <Link href="/login?from=/profile/address" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', textDecoration: 'none' }}>
            Đăng nhập lại
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>
      ) : addresses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Bạn chưa có địa chỉ nào.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {addresses.map(addr => (
            <div key={addr.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <strong style={{ fontSize: '16px' }}>{addr.fullName}</strong>
                  <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                  <span style={{ color: 'var(--text-muted)' }}>{addr.phone}</span>
                  {addr.isDefault && <span style={{ fontSize: '10px', padding: '2px 8px', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px' }}>Mặc định</span>}
                </div>
                <p style={{ margin: '4px 0', fontSize: '14px', color: 'var(--text-muted)' }}>{addr.detailAddress}</p>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>{addr.ward}, {addr.district}, {addr.province}</p>
              </div>
              <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                <button style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer' }}>Sửa</button>
                <button onClick={() => deleteAddress(addr.id)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer' }}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Thêm địa chỉ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121212', width: '500px', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ marginBottom: '20px' }}>Địa chỉ mới</h2>
            <form onSubmit={handleAddAddress} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input required placeholder="Họ và tên" className="input-field" style={{ flex: 1 }} value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                <input required placeholder="Số điện thoại" className="input-field" style={{ flex: 1 }} value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <input required placeholder="Tỉnh/Thành phố" className="input-field" value={formData.province} onChange={e => setFormData({...formData, province: e.target.value})} />
              <input required placeholder="Quận/Huyện" className="input-field" value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})} />
              <input required placeholder="Phường/Xã" className="input-field" value={formData.ward} onChange={e => setFormData({...formData, ward: e.target.value})} />
              <textarea required placeholder="Địa chỉ cụ thể (Số nhà, tên đường...)" className="input-field" style={{ minHeight: '80px' }} value={formData.detailAddress} onChange={e => setFormData({...formData, detailAddress: e.target.value})} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Trở Lại</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Hoàn Thành</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
