'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { compareMoneyStrings, multiplyMoneyByQuantity } from '@/lib/utils/client-money';
import { useToastStore } from '@/components/ui/Toast';
import { clearCheckoutKey, getOrCreateCheckoutKey } from '@/lib/checkout-idempotency';

interface CheckoutForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: 'Banking' | 'MoMo';
}
interface BankInfo { id: string; bankName: string; accountNumber: string; accountName: string; isDefault: boolean }
interface WalletInfo { balance: string; currency: string; hasPaymentPin: boolean }

const STORAGE_KEY = 'checkoutFormData';
const CHECKOUT_USER_STORAGE_KEY = 'checkoutUserId';

function apiMessage(data: unknown, fallback: string) {
  if (typeof data !== 'object' || data === null || !('error' in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const { items, clearCart, getTotal } = useCartStore();
  const [checkoutData, setCheckoutData] = useState<CheckoutForm | null>(null);
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [momoPhone, setMomoPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const method = searchParams.get('method') as 'Banking' | 'MoMo' | null;
  const total = getTotal();

  useEffect(() => {
    if (method !== 'Banking' && method !== 'MoMo') { router.replace('/checkout'); return; }
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) { router.replace('/checkout'); return; }
    try {
      const data = JSON.parse(stored) as CheckoutForm;
      if (data.paymentMethod !== method) { router.replace('/checkout'); return; }
      setCheckoutData(data);
      if (method === 'MoMo') setMomoPhone(data.customerPhone);
    } catch { router.replace('/checkout'); }
  }, [method, router]);

  useEffect(() => {
    if (method !== 'Banking' && method !== 'MoMo') return;
    const load = async () => {
      try {
        const responses = await Promise.all([
          fetch('/api/user/balance'),
          method === 'Banking' ? fetch('/api/user/bank') : Promise.resolve(null),
        ]);
        const balanceRes = responses[0];
        if (balanceRes.status === 401) { router.replace('/login?from=/checkout'); return; }
        const balanceData = await balanceRes.json();
        if (!balanceRes.ok) throw new Error(apiMessage(balanceData, 'Không tải được số dư'));
        setWallet(balanceData);
        const bankRes = responses[1];
        if (bankRes) {
          const bankData = await bankRes.json();
          if (!bankRes.ok) throw new Error(apiMessage(bankData, 'Không tải được tài khoản ngân hàng'));
          setBanks(bankData);
          const preferred = bankData.find((bank: BankInfo) => bank.isDefault) ?? bankData[0];
          if (preferred) setSelectedBank(preferred.id);
        }
      } catch (error) {
        addToast(error instanceof Error ? error.message : 'Không tải được thông tin thanh toán');
      } finally { setPageLoading(false); }
    };
    void load();
  }, [method, router, addToast]);

  const handlePayment = async () => {
    if (!checkoutData || !method || !wallet) return;
    if (!wallet.hasPaymentPin) { addToast('Bạn chưa tạo PIN giao dịch. Hãy vào trang Ngân hàng để thiết lập.'); return; }
    if (!/^\d{6}$/.test(pin)) { addToast('Mã PIN giao dịch phải gồm đúng 6 chữ số.'); return; }
    if (method === 'Banking' && !selectedBank) { addToast('Vui lòng chọn tài khoản ngân hàng.'); return; }
    if (method === 'MoMo' && !/^0\d{9}$/.test(momoPhone)) { addToast('Số điện thoại MoMo phải gồm 10 số và bắt đầu bằng 0.'); return; }
    if (compareMoneyStrings(total, wallet.balance) > 0) { addToast('Số dư demo không đủ. Vui lòng nạp thêm tiền.'); return; }
    if (items.length === 0) { addToast('Giỏ hàng trống.'); router.push('/cart'); return; }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({ productId: item.product.id, quantity: item.quantity }));
      const checkoutUserId = window.sessionStorage.getItem(CHECKOUT_USER_STORAGE_KEY);
      if (!checkoutUserId) throw new Error('Không xác định được người dùng checkout');
      const safePayload = { ...checkoutData, items: orderItems, bankId: method === 'Banking' ? selectedBank : undefined, paymentPhone: method === 'MoMo' ? momoPhone : undefined };
      const idempotencyKey = await getOrCreateCheckoutKey(window.sessionStorage, checkoutUserId, safePayload);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({ ...safePayload, paymentPin: pin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(apiMessage(data, 'Lỗi khi tạo đơn hàng'));
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(CHECKOUT_USER_STORAGE_KEY);
      clearCheckoutKey(window.sessionStorage);
      clearCart();
      addToast(`Thanh toán demo thành công! Đã trừ ${formatPrice(total)}.`);
      router.push('/profile/orders');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Lỗi thanh toán');
    } finally { setLoading(false); }
  };

  if (!checkoutData || !method || !wallet || pageLoading) return null;

  return (
    <div className="page-container">
      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 32 }}>Xác thực thanh toán demo</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 1fr)', gap: 32 }}>
        <div className="glass-card" style={{ padding: 32 }}>
          <div style={{ padding: 16, borderRadius: 16, background: 'rgba(56, 189, 248, 0.08)', marginBottom: 24 }}>
            <strong>{method === 'Banking' ? '🏦 Banking demo' : '💗 MoMo demo'}</strong>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)' }}>Không kết nối cổng thanh toán thật. Giao dịch trừ trực tiếp số dư demo trong tài khoản của bạn.</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>Số dư khả dụng</span><div style={{ fontSize: 26, fontWeight: 800 }}>{formatPrice(Number(wallet.balance))}</div></div>
            <Link href="/profile/bank" className="btn-secondary" style={{ textDecoration: 'none' }}>Nạp tiền / tạo PIN</Link>
          </div>
          {!wallet.hasPaymentPin && <p style={{ color: '#fb923c' }}>Bạn cần tạo PIN giao dịch ở trang Ngân hàng trước khi thanh toán.</p>}

          {method === 'Banking' ? (
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              <label style={{ fontWeight: 700 }}>Chọn tài khoản</label>
              {banks.length === 0 ? <p style={{ color: '#fb923c' }}>Chưa có tài khoản ngân hàng. <Link href="/profile/bank">Thêm tại đây</Link>.</p> : banks.map(bank => (
                <label key={bank.id} style={{ padding: 14, borderRadius: 14, border: selectedBank === bank.id ? '1px solid var(--accent)' : '1px solid var(--border)', cursor: 'pointer' }}>
                  <input type="radio" checked={selectedBank === bank.id} onChange={() => setSelectedBank(bank.id)} />{' '}
                  {bank.bankName} •••• {bank.accountNumber.slice(-4)} — {bank.accountName}
                </label>
              ))}
            </div>
          ) : (
            <div style={{ marginBottom: 20 }}><label className="input-label">Số điện thoại MoMo</label><input className="input-field" inputMode="numeric" maxLength={10} value={momoPhone} onChange={e => setMomoPhone(e.target.value.replace(/\D/g, ''))} placeholder="09xxxxxxxx" /></div>
          )}
          <div style={{ marginBottom: 24 }}><label className="input-label">PIN giao dịch chung</label><input className="input-field" type="password" inputMode="numeric" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" /></div>
          <button type="button" onClick={() => void handlePayment()} disabled={loading || !wallet.hasPaymentPin || (method === 'Banking' && banks.length === 0)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 16 }}>
            {loading ? 'Đang xử lý...' : `Thanh toán ${formatPrice(total)}`}
          </button>
          <button type="button" onClick={() => router.push('/checkout')} className="btn-secondary" style={{ marginTop: 12, width: '100%', justifyContent: 'center', padding: 16 }}>Quay lại</button>
        </div>

        <div className="glass-card" style={{ padding: 24, alignSelf: 'start' }}>
          <h3 style={{ marginTop: 0 }}>Tóm tắt đơn hàng</h3>
          {items.map(item => <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 12, fontSize: 14 }}><span>{item.product.name} × {item.quantity}</span><span>{formatPrice(multiplyMoneyByQuantity(item.product.price, item.quantity))}</span></div>)}
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 20, paddingTop: 20, fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}><span>Tổng</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}