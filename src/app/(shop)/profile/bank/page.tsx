'use client';
import { useState, useEffect } from 'react';
import { useToastStore } from '@/components/ui/Toast';

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function BankPage() {
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });

  const fetchBanks = async () => {
    try {
      const res = await fetch('/api/user/bank');
      const data = await res.json();
      if (Array.isArray(data)) setBanks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanks(); }, []);

  const handleAddBank = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user/bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        addToast('Thêm ngân hàng thành công! 🏦');
        setShowModal(false);
        setFormData({ bankName: '', accountNumber: '', accountName: '' });
        fetchBanks();
      }
    } catch (err) {
      addToast('Lỗi khi thêm.');
    }
  };

  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Thẻ Ngân Hàng</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '5px' }}>Quản lý thẻ tín dụng/ghi nợ và tài khoản ngân hàng</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          ➕ Thêm Ngân Hàng
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>
      ) : banks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Bạn chưa có tài khoản ngân hàng nào.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {banks.map(bank => (
            <div key={bank.id} style={{ 
              padding: '24px', borderRadius: '20px', 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
              border: '1px solid rgba(255,255,255,0.1)',
              position: 'relative', overflow: 'hidden'
            }}>
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '80px', opacity: 0.1 }}>🏦</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', textTransform: 'uppercase' }}>{bank.bankName}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', marginBottom: '15px' }}>**** **** **** {bank.accountNumber.slice(-4)}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '14px', margin: 0, fontWeight: 600 }}>{bank.accountName}</p>
                <span style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer' }}>Xóa</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121212', width: '450px', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ marginBottom: '20px' }}>Thêm tài khoản ngân hàng</h2>
            <form onSubmit={handleAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Tên Ngân hàng (Ví dụ: Vietcombank)" className="input-field" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
              <input required placeholder="Số tài khoản" className="input-field" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
              <input required placeholder="Họ và tên chủ tài khoản (viết hoa không dấu)" className="input-field" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} />
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Hủy</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
