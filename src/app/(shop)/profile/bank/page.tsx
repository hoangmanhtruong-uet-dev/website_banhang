'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault: boolean;
}

interface WalletInfo {
  balance: string;
  currency: string;
  hasPaymentPin: boolean;
}

function apiMessage(data: unknown, fallback: string) {
  if (typeof data !== 'object' || data === null || !('error' in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

export default function BankPage() {
  const addToast = useToastStore(s => s.addToast);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('1000000');
  const [pinForm, setPinForm] = useState({ currentPassword: '', pin: '' });
  const [bankForm, setBankForm] = useState({ bankName: '', accountNumber: '', accountName: '', isDefault: false });

  const reload = useCallback(async () => {
    try {
      const [balanceRes, bankRes] = await Promise.all([fetch('/api/user/balance'), fetch('/api/user/bank')]);
      if (balanceRes.status === 401 || bankRes.status === 401) {
        setAuthError(true);
        return;
      }
      if (!balanceRes.ok || !bankRes.ok) throw new Error('Không tải được thông tin ví');
      setWallet(await balanceRes.json());
      setBanks(await bankRes.json());
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không tải được trang ngân hàng');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void reload(); }, [reload]);

  const handleTopUp = async (amount = topUpAmount) => {
    setBusy(true);
    try {
      const res = await fetch('/api/user/balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Nạp tiền demo thất bại'));
      setWallet(prev => prev ? { ...prev, balance: data.balance } : prev);
      addToast(`Đã nạp ${formatPrice(Number(data.amount))} vào số dư demo`);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Nạp tiền demo thất bại');
    } finally {
      setBusy(false);
    }
  };

  const handlePin = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/user/payment-pin', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pinForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Không thể cập nhật PIN'));
      setWallet(prev => prev ? { ...prev, hasPaymentPin: true } : prev);
      setPinForm({ currentPassword: '', pin: '' });
      addToast('Đã cập nhật mã PIN giao dịch');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể cập nhật PIN');
    } finally {
      setBusy(false);
    }
  };

  const handleBank = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/user/bank', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bankForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Không thể thêm tài khoản'));
      setBankForm({ bankName: '', accountNumber: '', accountName: '', isDefault: false });
      await reload();
      addToast('Đã thêm tài khoản ngân hàng');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể thêm tài khoản');
    } finally {
      setBusy(false);
    }
  };

  if (authError) return (
    <div className="glass-card" style={{ padding: 32, textAlign: 'center' }}>
      <p>Phiên đăng nhập đã hết hạn.</p>
      <Link href="/login?from=/profile/bank" className="btn-primary">Đăng nhập lại</Link>
    </div>
  );
  if (loading) return <div className="glass-card" style={{ padding: 32 }}>Đang tải...</div>;

  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <section className="glass-card" style={{ padding: 28 }}>
        <p style={{ margin: 0, color: 'var(--accent)', fontWeight: 700 }}>NGÂN HÀNG DEMO</p>
        <h1 style={{ margin: '10px 0 4px', fontSize: 30 }}>Số dư khả dụng</h1>
        <p style={{ margin: 0, fontSize: 34, fontWeight: 800 }}>{formatPrice(Number(wallet?.balance ?? 0))}</p>
        <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Đây là tiền mô phỏng trong hệ thống, không liên kết ngân hàng hay MoMo thật.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['500000', '1000000', '5000000'].map(amount => (
            <button key={amount} type="button" className="btn-secondary" disabled={busy} onClick={() => { setTopUpAmount(amount); void handleTopUp(amount); }}>
              + {formatPrice(Number(amount))}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 12, maxWidth: 480 }}>
          <input className="input-field" inputMode="numeric" value={topUpAmount} onChange={e => setTopUpAmount(e.target.value.replace(/\D/g, ''))} placeholder="Từ 100.000 đến 100.000.000" />
          <button type="button" className="btn-primary" disabled={busy} onClick={() => void handleTopUp()}>Nạp demo</button>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24 }}>
        <section className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>PIN giao dịch</h2>
          <p style={{ color: 'var(--text-muted)' }}>{wallet?.hasPaymentPin ? 'PIN đã được thiết lập. Bạn có thể đổi PIN bên dưới.' : 'Tạo PIN 6 số để xác nhận Banking và MoMo.'}</p>
          <form onSubmit={handlePin} style={{ display: 'grid', gap: 12 }}>
            <input className="input-field" type="password" autoComplete="current-password" required value={pinForm.currentPassword} onChange={e => setPinForm({ ...pinForm, currentPassword: e.target.value })} placeholder="Mật khẩu đăng nhập hiện tại" />
            <input className="input-field" type="password" inputMode="numeric" required maxLength={6} pattern="\d{6}" value={pinForm.pin} onChange={e => setPinForm({ ...pinForm, pin: e.target.value.replace(/\D/g, '') })} placeholder="PIN mới gồm 6 số" />
            <button className="btn-primary" disabled={busy}>{wallet?.hasPaymentPin ? 'Đổi PIN' : 'Tạo PIN'}</button>
          </form>
        </section>

        <section className="glass-card" style={{ padding: 28 }}>
          <h2 style={{ marginTop: 0 }}>Thêm tài khoản ngân hàng</h2>
          <p style={{ color: 'var(--text-muted)' }}>Tài khoản dùng để chọn nguồn thanh toán demo; hệ thống chỉ trừ số dư chung ở trên.</p>
          <form onSubmit={handleBank} style={{ display: 'grid', gap: 12 }}>
            <input className="input-field" required value={bankForm.bankName} onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="Tên ngân hàng" />
            <input className="input-field" required inputMode="numeric" value={bankForm.accountNumber} onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value.replace(/\D/g, '') })} placeholder="Số tài khoản" />
            <input className="input-field" required value={bankForm.accountName} onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })} placeholder="Tên chủ tài khoản" />
            <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={bankForm.isDefault} onChange={e => setBankForm({ ...bankForm, isDefault: e.target.checked })} /> Đặt làm mặc định</label>
            <button className="btn-primary" disabled={busy}>Thêm tài khoản</button>
          </form>
        </section>
      </div>

      <section className="glass-card" style={{ padding: 28 }}>
        <h2 style={{ marginTop: 0 }}>Tài khoản đã liên kết</h2>
        {banks.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>Chưa có tài khoản nào.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 16 }}>
            {banks.map(bank => (
              <div key={bank.id} style={{ padding: 20, borderRadius: 18, background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><strong>{bank.bankName}</strong>{bank.isDefault && <span style={{ color: 'var(--accent)', fontSize: 12 }}>Mặc định</span>}</div>
                <p style={{ letterSpacing: 2 }}>•••• •••• {bank.accountNumber.slice(-4)}</p>
                <p style={{ marginBottom: 0, color: 'var(--text-muted)' }}>{bank.accountName}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}