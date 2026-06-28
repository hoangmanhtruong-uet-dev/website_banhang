'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToastStore } from '@/components/ui/Toast';

const BALANCE_STORAGE_KEY = 'paymentBalanceSimulator';
const DEFAULT_BANK_BALANCE = 5000000;

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export default function BankPage() {
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankInfo | null>(null);
  const [bankBalance, setBankBalance] = useState(DEFAULT_BANK_BALANCE);
  const addToast = useToastStore(s => s.addToast);

  const [formData, setFormData] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
    pin: '',
  });

  const fetchBanks = async () => {
    try {
      const res = await fetch('/api/user/bank');
      if (res.status === 401) {
        setAuthError(true);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setBanks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadBalance = () => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(BALANCE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (typeof parsed.Banking === 'number') setBankBalance(parsed.Banking);
      } catch {
        setBankBalance(DEFAULT_BANK_BALANCE);
      }
    }
  };

  useEffect(() => {
    fetchBanks();
    loadBalance();
    const onBalanceUpdate = () => loadBalance();
    window.addEventListener('payment-balance-updated', onBalanceUpdate);
    window.addEventListener('storage', onBalanceUpdate);
    return () => {
      window.removeEventListener('payment-balance-updated', onBalanceUpdate);
      window.removeEventListener('storage', onBalanceUpdate);
    };
  }, []);

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
        setShowAddModal(false);
        setFormData({ bankName: '', accountNumber: '', accountName: '', pin: '' });
        fetchBanks();
      }
    } catch {
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
        <button onClick={() => setShowAddModal(true)} className="btn-primary" style={{ padding: '10px 20px', fontSize: '14px' }}>
          ➕ Thêm Ngân Hàng
        </button>
      </div>

      {authError ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>
          <p>Phiên đăng nhập đã hết hạn.</p>
          <Link href="/login?from=/profile/bank" className="btn-primary" style={{ display: 'inline-block', marginTop: '16px', padding: '10px 24px', textDecoration: 'none' }}>
            Đăng nhập lại
          </Link>
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>Đang tải...</div>
      ) : banks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-muted)' }}>Bạn chưa có tài khoản ngân hàng nào.</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {banks.map(bank => (
            <button
              key={bank.id}
              type="button"
              onClick={() => {
                setSelectedBank(bank);
                setShowDetailsModal(true);
              }}
              style={{
                textAlign: 'left', padding: '24px', borderRadius: '20px',
                background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                border: '1px solid rgba(255,255,255,0.1)',
                position: 'relative', overflow: 'hidden', cursor: 'pointer',
                color: 'inherit'
              }}
            >
              <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '80px', opacity: 0.1 }}>🏦</div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px', textTransform: 'uppercase' }}>{bank.bankName}</p>
              <p style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '2px', marginBottom: '15px' }}>**** **** **** {bank.accountNumber.slice(-4)}</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <p style={{ fontSize: '14px', margin: 0, fontWeight: 600 }}>{bank.accountName}</p>
                <span style={{ fontSize: '12px', color: 'var(--accent)' }}>Xem chi tiết</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDetailsModal && selectedBank && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121212', width: '460px', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700 }}>{selectedBank.bankName}</h2>
                <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>Thông tin tài khoản ngân hàng</p>
              </div>
              <button type="button" onClick={() => { setShowDetailsModal(false); setSelectedBank(null); }} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '13px' }}>
                Đóng
              </button>
            </div>
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Chủ tài khoản</p>
                <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{selectedBank.accountName}</p>
              </div>
              <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Số tài khoản</p>
                <p style={{ margin: '8px 0 0', fontWeight: 700 }}>{selectedBank.accountNumber}</p>
              </div>
              <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>Số dư khả dụng</p>
                <p style={{ margin: '8px 0 0', fontWeight: 700, fontSize: '20px' }}>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(bankBalance)}</p>
              </div>
              <div style={{ padding: '18px', borderRadius: '18px', background: 'rgba(56, 189, 248, 0.08)', color: '#dbeafe', border: '1px solid rgba(56, 189, 248, 0.24)' }}>
                <p style={{ margin: 0, fontWeight: 700 }}>Thông tin thêm</p>
                <ul style={{ margin: '12px 0 0', paddingLeft: '18px', color: 'var(--text-muted)' }}>
                  <li>Loại tài khoản: Thanh toán nội địa</li>
                  <li>Ngân hàng: {selectedBank.bankName}</li>
                  <li>Trạng thái: Hoạt động</li>
                </ul>
              </div>
              <button type="button" onClick={() => { setShowDetailsModal(false); setSelectedBank(null); }} className="btn-primary" style={{ width: '100%', padding: '14px 18px' }}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#121212', width: '450px', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h2 style={{ marginBottom: '20px' }}>Thêm tài khoản ngân hàng</h2>
            <form onSubmit={handleAddBank} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input required placeholder="Tên Ngân hàng (Ví dụ: Vietcombank)" className="input-field" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} />
              <input required placeholder="Số tài khoản" className="input-field" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} />
              <input required placeholder="Họ và tên chủ tài khoản (viết hoa không dấu)" className="input-field" value={formData.accountName} onChange={e => setFormData({...formData, accountName: e.target.value})} />
              <input required type="password" placeholder="Mã PIN giao dịch (6 chữ số)" maxLength={6} className="input-field" value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value.replace(/\D/g, '')})} />
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>* Mã PIN này sẽ được dùng để xác nhận khi bạn thanh toán bằng Banking.</p>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary" style={{ padding: '10px 20px' }}>Hủy</button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 20px' }}>Xác nhận thêm</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
