'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';
import { clearCheckoutKey, getOrCreateCheckoutKey } from '@/lib/checkout-idempotency';

interface CheckoutForm {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: 'Banking' | 'MoMo';
}

interface BankInfo {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

const STORAGE_KEY = 'checkoutFormData';
const CHECKOUT_USER_STORAGE_KEY = 'checkoutUserId';
const BALANCE_STORAGE_KEY = 'paymentBalanceSimulator';
const DEFAULT_BALANCE = {
  Banking: 5000000,
  MoMo: 2000000,
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const { items, clearCart, getTotal } = useCartStore();
  const [checkoutData, setCheckoutData] = useState<CheckoutForm | null>(null);
  const [banks, setBanks] = useState<BankInfo[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [momoPhone, setMomoPhone] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState(DEFAULT_BALANCE);

  const method = searchParams.get('method') as 'Banking' | 'MoMo' | null;
  const total = getTotal();

  useEffect(() => {
    if (!method) {
      router.push('/checkout');
      return;
    }

    const stored = typeof window !== 'undefined' ? window.sessionStorage.getItem(STORAGE_KEY) : null;
    if (!stored) {
      router.push('/checkout');
      return;
    }

    try {
      const data = JSON.parse(stored) as CheckoutForm;
      if (!data || data.paymentMethod !== method) {
        router.push('/checkout');
        return;
      }
      setCheckoutData(data);
    } catch {
      router.push('/checkout');
    }
  }, [method, router]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedBalances = window.localStorage.getItem(BALANCE_STORAGE_KEY);
    if (storedBalances) {
      try {
        setBalances(JSON.parse(storedBalances));
      } catch {
        setBalances(DEFAULT_BALANCE);
      }
    }
  }, []);

  useEffect(() => {
    if (method === 'Banking') {
      fetch('/api/user/bank')
        .then(res => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setBanks(data);
            if (data.length > 0) {
              setSelectedBank(data[0].id);
            }
          }
        })
        .catch(() => {
          addToast('Không thể tải tài khoản ngân hàng.');
        });
    }
  }, [method, addToast]);

  const handlePayment = async () => {
    if (!checkoutData) return;

    if (method === 'Banking') {
      if (!selectedBank) {
        addToast('Vui lòng chọn tài khoản ngân hàng.');
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        addToast('Mã PIN ngân hàng phải gồm 6 chữ số.');
        return;
      }
      if (total > balances.Banking) {
        addToast('Tài khoản ngân hàng không đủ số dư.');
        return;
      }
    }

    if (method === 'MoMo') {
      if (!/^\d{10,11}$/.test(momoPhone)) {
        addToast('Số điện thoại MoMo không hợp lệ.');
        return;
      }
      if (!/^\d{6}$/.test(pin)) {
        addToast('Mã PIN MoMo phải gồm 6 chữ số.');
        return;
      }
      if (total > balances.MoMo) {
        addToast('Số dư ví MoMo không đủ.');
        return;
      }
    }

    if (items.length === 0) {
      addToast('Giỏ hàng trống.');
      router.push('/cart');
      return;
    }

    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price,
      }));

      const checkoutUserId = window.sessionStorage.getItem(CHECKOUT_USER_STORAGE_KEY);
      if (!checkoutUserId) throw new Error('Không xác định được người dùng checkout');
      const requestPayload = { ...checkoutData, items: orderItems };
      const idempotencyKey = await getOrCreateCheckoutKey(window.sessionStorage, checkoutUserId, requestPayload);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || 'Lỗi khi tạo đơn hàng.');
      }

      const newBalances = { ...balances };
      if (method === 'Banking') {
        newBalances.Banking = Math.max(0, balances.Banking - total);
      } else if (method === 'MoMo') {
        newBalances.MoMo = Math.max(0, balances.MoMo - total);
      }
      setBalances(newBalances);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(BALANCE_STORAGE_KEY, JSON.stringify(newBalances));
        window.dispatchEvent(new Event('payment-balance-updated'));
      }

      window.sessionStorage.removeItem(STORAGE_KEY);
      clearCheckoutKey(window.sessionStorage);
      window.sessionStorage.removeItem(CHECKOUT_USER_STORAGE_KEY);
      clearCart();
      addToast(`Thanh toán thành công! Đã trừ ${formatPrice(total)} khỏi số dư ${method}. 🎉`);
      router.push('/profile/orders');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Lỗi thanh toán';
      addToast(message);
    } finally {
      setLoading(false);
    }
  };

  if (!checkoutData || !method) {
    return null;
  }

  return (
    <div className="page-container">
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '40px' }}>Xác thực thanh toán</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
        <div className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>🛡️ Xác thực {method}</h3>
          <div style={{ marginBottom: '20px', color: 'var(--text-muted)' }}>
            {method === 'Banking' ? (
              <p>Vui lòng chọn tài khoản và nhập mã PIN ngân hàng để xác thực giao dịch.</p>
            ) : (
              <p>Vui lòng nhập số điện thoại ví MoMo và mã PIN bảo mật để xác thực.</p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <button type="button" onClick={() => router.push('/checkout/payment/simulator')} className="btn-secondary" style={{ padding: '10px 16px' }}>
              Mở trang giả lập số dư
            </button>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Số dư được lưu trong trình duyệt.</span>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: 0, fontWeight: 600 }}>Thông tin thanh toán</p>
            <p style={{ margin: '4px 0 0' }}>Tên: {checkoutData.customerName}</p>
            <p style={{ margin: '4px 0 0' }}>Email: {checkoutData.customerEmail}</p>
            <p style={{ margin: '4px 0 0' }}>SĐT: {checkoutData.customerPhone}</p>
            <p style={{ margin: '4px 0 0' }}>Địa chỉ: {checkoutData.shippingAddress}</p>
          </div>

          {method === 'Banking' ? (
            <>
              {banks.length === 0 ? (
                <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(248, 113, 113, 0.1)', color: '#f97316' }}>
                  Bạn chưa có tài khoản ngân hàng. Vui lòng thêm tài khoản trong mục Hồ sơ &gt; Ngân hàng.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
                  <label style={{ fontWeight: 600 }}>Chọn tài khoản ngân hàng</label>
                  {banks.map(bank => (
                    <label key={bank.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', borderRadius: '16px', border: selectedBank === bank.id ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                      <input type="radio" name="bank" value={bank.id} checked={selectedBank === bank.id} onChange={() => setSelectedBank(bank.id)} />
                      <span>{bank.bankName} • ****{bank.accountNumber.slice(-4)} • {bank.accountName}</span>
                    </label>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Mã PIN ngân hàng</label>
                <input className="input-field" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" maxLength={6} />
              </div>
              <div style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Số dư giả lập: {formatPrice(balances.Banking)}
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Số điện thoại MoMo</label>
                <input className="input-field" value={momoPhone} onChange={e => setMomoPhone(e.target.value.replace(/\D/g, ''))} placeholder="09xxxxxxxx" />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label className="input-label">Mã PIN ví MoMo</label>
                <input className="input-field" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ''))} placeholder="6 chữ số" maxLength={6} />
              </div>
              <div style={{ marginBottom: '24px', color: 'var(--text-muted)', fontSize: '14px' }}>
                Số dư ví giả lập: {formatPrice(balances.MoMo)}
              </div>
            </>
          )}

          <button type="button" onClick={handlePayment} disabled={loading || (method === 'Banking' && banks.length === 0)} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }}>
            {loading ? 'Đang xử lý...' : `Thanh toán ${formatPrice(total)}`}
          </button>
          <button type="button" onClick={() => router.push('/checkout')} className="btn-secondary" style={{ marginTop: '12px', width: '100%', justifyContent: 'center', padding: '16px' }}>
            Quay lại trang thanh toán
          </button>
        </div>

        <div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>Tóm tắt đơn hàng</h3>
            {items.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                <span>{item.product.name} x {item.quantity}</span>
                <span>{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: '20px', paddingTop: '20px', fontWeight: 700, display: 'flex', justifyContent: 'space-between' }}>
              <span>Tổng</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
