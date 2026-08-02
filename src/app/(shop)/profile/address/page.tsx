'use client';

import { useCallback, useEffect, useState } from 'react';
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

type AddressForm = Omit<Address, 'id'>;

const emptyForm: AddressForm = {
  fullName: '',
  phone: '',
  province: '',
  district: '',
  ward: '',
  detailAddress: '',
  isDefault: false,
};

export default function AddressPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [formData, setFormData] = useState<AddressForm>(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const addToast = useToastStore(state => state.addToast);

  const fetchAddresses = useCallback(async () => {
    try {
      const response = await fetch('/api/user/addresses');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải địa chỉ');
      setAddresses(Array.isArray(data) ? data : []);
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể tải địa chỉ');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchAddresses();
  }, [fetchAddresses]);

  const openAdd = () => {
    setEditingId('');
    setFormData(emptyForm);
    setShowModal(true);
  };

  const openEdit = (address: Address) => {
    setEditingId(address.id);
    setFormData({
      fullName: address.fullName,
      phone: address.phone,
      province: address.province,
      district: address.district,
      ward: address.ward,
      detailAddress: address.detailAddress,
      isDefault: address.isDefault,
    });
    setShowModal(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/user/addresses/${editingId}` : '/api/user/addresses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể lưu địa chỉ');
      addToast(editingId ? 'Đã cập nhật địa chỉ.' : 'Đã thêm địa chỉ mới.');
      setShowModal(false);
      await fetchAddresses();
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể lưu địa chỉ');
    } finally {
      setSaving(false);
    }
  };

  const deleteAddress = async (id: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa địa chỉ này?')) return;
    try {
      const response = await fetch(`/api/user/addresses/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể xóa địa chỉ');
      addToast('Đã xóa địa chỉ.');
      await fetchAddresses();
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể xóa địa chỉ');
    }
  };

  return (
    <>
      <div className="glass-card" style={{ padding: '30px', borderRadius: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Địa chỉ của tôi</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>Quản lý địa chỉ nhận hàng.</p>
        </div>
        <button type="button" onClick={openAdd} className="btn-primary">＋ Thêm địa chỉ</button>
      </div>

      {loading ? (
        <p>Đang tải...</p>
      ) : addresses.length === 0 ? (
        <p style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Bạn chưa có địa chỉ nào.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {addresses.map(address => (
            <div key={address.id} style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
              <div>
                <strong>{address.fullName}</strong>
                <span style={{ color: 'var(--text-muted)', marginLeft: '10px' }}>{address.phone}</span>
                {address.isDefault && <span style={{ fontSize: '10px', padding: '2px 8px', marginLeft: '10px', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '4px' }}>Mặc định</span>}
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>{address.detailAddress}, {address.ward}, {address.district}, {address.province}</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" onClick={() => openEdit(address)} style={{ color: 'var(--accent)', background: 'none', border: 0, cursor: 'pointer' }}>Sửa</button>
                <button type="button" onClick={() => deleteAddress(address.id)} style={{ color: '#ef4444', background: 'none', border: 0, cursor: 'pointer' }}>Xóa</button>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>

      {showModal && (
        <div className="modal-overlay" style={{ zIndex: 1000, padding: '16px' }} onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setShowModal(false);
        }}>
          <form onSubmit={handleSubmit} className="modal-content" style={{ width: 'min(560px, 100%)', maxWidth: '560px', maxHeight: 'calc(100dvh - 32px)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h2>{editingId ? 'Sửa địa chỉ' : 'Địa chỉ mới'}</h2>
            <input required minLength={2} placeholder="Họ và tên" className="input-field" value={formData.fullName} onChange={event => setFormData({ ...formData, fullName: event.target.value })} />
            <input required pattern="0[0-9]{9}" placeholder="Số điện thoại" className="input-field" value={formData.phone} onChange={event => setFormData({ ...formData, phone: event.target.value.replace(/\D/g, '') })} />
            <input required minLength={2} placeholder="Tỉnh/Thành phố" className="input-field" value={formData.province} onChange={event => setFormData({ ...formData, province: event.target.value })} />
            <input required minLength={2} placeholder="Quận/Huyện" className="input-field" value={formData.district} onChange={event => setFormData({ ...formData, district: event.target.value })} />
            <input required minLength={2} placeholder="Phường/Xã" className="input-field" value={formData.ward} onChange={event => setFormData({ ...formData, ward: event.target.value })} />
            <textarea required minLength={5} placeholder="Số nhà, tên đường..." className="input-field" value={formData.detailAddress} onChange={event => setFormData({ ...formData, detailAddress: event.target.value })} />
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="checkbox" checked={formData.isDefault} onChange={event => setFormData({ ...formData, isDefault: event.target.checked })} />
              Đặt làm địa chỉ mặc định
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Hủy</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Đang lưu...' : 'Lưu địa chỉ'}</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
