'use client';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { orderSchema } from '@/lib/validations';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clearCheckoutKey, getOrCreateCheckoutKey } from '@/lib/checkout-idempotency';

type CheckoutForm = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: 'COD' | 'Banking' | 'MoMo';
};

interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  province: string;
  district: string;
  ward: string;
  detailAddress: string;
  isDefault: boolean;
}

const STORAGE_KEY = 'checkoutFormData';
const CHECKOUT_USER_STORAGE_KEY = 'checkoutUserId';

function formatAddress(addr: SavedAddress) {
  return `${addr.detailAddress}, ${addr.ward}, ${addr.district}, ${addr.province}`;
}

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkoutUserId, setCheckoutUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [codOtp, setCodOtp] = useState('');
  const [formData, setFormData] = useState<CheckoutForm>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    paymentMethod: 'COD',
  });

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    const loadProfile = async () => {
      try {
        const [meRes, addrRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/user/addresses'),
        ]);

        if (meRes.ok) {
          const meData = await meRes.json();
          if (meData.user) {
            setCheckoutUserId(meData.user.id);
            setFormData(prev => ({
              ...prev,
              customerName: meData.user.name || prev.customerName,
              customerEmail: meData.user.email || prev.customerEmail,
              customerPhone: meData.user.phone || prev.customerPhone,
            }));
          }
        }

        if (addrRes.ok) {
          const addrData = await addrRes.json();
          if (Array.isArray(addrData) && addrData.length > 0) {
            setAddresses(addrData);
            const defaultAddr = addrData.find((a: SavedAddress) => a.isDefault) || addrData[0];
            setSelectedAddressId(defaultAddr.id);
            setFormData(prev => ({
              ...prev,
              customerName: defaultAddr.fullName,
              customerPhone: defaultAddr.phone,
              shippingAddress: formatAddress(defaultAddr),
            }));
          }
        }
      } catch {
        /* giữ form trống để nhập tay */
      }
    };

    loadProfile();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (items.length === 0) {
      router.push('/cart');
    }
  }, [hydrated, items, router]);

  const handleSelectAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    const addr = addresses.find(a => a.id === addrId);
    if (!addr) return;
    setFormData(prev => ({
      ...prev,
      customerName: addr.fullName,
      customerPhone: addr.phone,
      shippingAddress: formatAddress(addr),
    }));
  };

  if (!hydrated || items.length === 0) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      orderSchema.parse(formData);

      if (formData.paymentMethod === 'COD') {
        if (!codOtp || codOtp.length < 4) {
          addToast('Vui lòng nhập mã xác nhận đơn hàng.');
          setLoading(false);
          return;
        }
        const orderItems = items.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
          price: item.product.price,
        }));

        if (!checkoutUserId) throw new Error('Không xác định được người dùng checkout');
        const requestPayload = { ...formData, items: orderItems };
        const idempotencyKey = await getOrCreateCheckoutKey(window.sessionStorage, checkoutUserId, requestPayload);
        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error?.message || 'Lỗi khi tạo đơn hàng');
        }

        clearCheckoutKey(window.sessionStorage);
        window.sessionStorage.removeItem(CHECKOUT_USER_STORAGE_KEY);
        addToast('Đặt hàng thành công! Đơn hàng đang được xử lý. 🎉');
        clearCart();
        router.push('/profile/orders');
        return;
      }

      if (typeof window !== 'undefined') {
        if (!checkoutUserId) throw new Error('Không xác định được người dùng checkout');
        const orderItems = items.map(item => ({ productId: item.product.id, quantity: item.quantity, price: item.product.price }));
        await getOrCreateCheckoutKey(window.sessionStorage, checkoutUserId, { ...formData, items: orderItems });
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        window.sessionStorage.setItem(CHECKOUT_USER_STORAGE_KEY, checkoutUserId);
      }
      router.push(`/checkout/payment?method=${formData.paymentMethod}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Vui lòng kiểm tra lại thông tin';
      addToast(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '40px' }}>Thanh toán</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '40px' }}>
        <form onSubmit={handleSubmit} className="glass-card" style={{ padding: '32px' }}>
          <h3 style={{ marginBottom: '24px', fontSize: '18px', fontWeight: 600 }}>Thông tin giao hàng</h3>

          {addresses.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label className="input-label">Chọn địa chỉ đã lưu</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {addresses.map(addr => (
                  <label
                    key={addr.id}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px',
                      borderRadius: '12px', cursor: 'pointer',
                      border: selectedAddressId === addr.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: selectedAddressId === addr.id ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                    }}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      checked={selectedAddressId === addr.id}
                      onChange={() => handleSelectAddress(addr.id)}
                      style={{ marginTop: '4px' }}
                    />
                    <div>
                      <strong style={{ fontSize: '14px' }}>{addr.fullName}</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>{addr.phone}</span>
                      {addr.isDefault && (
                        <span style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--accent)' }}>Mặc định</span>
                      )}
                      <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {formatAddress(addr)}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                Hoặc chỉnh sửa thông tin bên dưới · <Link href="/profile/address" style={{ color: 'var(--accent)' }}>Quản lý địa chỉ</Link>
              </p>
            </div>
          )}

          {addresses.length === 0 && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Chưa có địa chỉ lưu. <Link href="/profile/address" style={{ color: 'var(--accent)' }}>Thêm địa chỉ</Link> để chọn nhanh lần sau.
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="input-label">Họ và tên</label>
              <input className="input-field" value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })} required />
            </div>
            <div>
              <label className="input-label">Số điện thoại</label>
              <input className="input-field" value={formData.customerPhone}
                onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} required />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Email</label>
            <input className="input-field" type="email" value={formData.customerEmail}
              onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">Địa chỉ nhận hàng</label>
            <textarea className="input-field" style={{ minHeight: '100px' }} value={formData.shippingAddress}
              onChange={e => {
                setSelectedAddressId('');
                setFormData({ ...formData, shippingAddress: e.target.value });
              }} required />
          </div>

          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Phương thức thanh toán</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            {(['COD', 'Banking', 'MoMo'] as const).map((method) => (
              <button key={method} type="button"
                onClick={() => setFormData({ ...formData, paymentMethod: method })}
                style={{
                  flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: formData.paymentMethod === method ? 'var(--accent)' : 'transparent',
                  color: formData.paymentMethod === method ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                {method}
              </button>
            ))}
          </div>

          {formData.paymentMethod === 'COD' ? (
            <div style={{ marginBottom: '24px', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <label className="input-label">Mã xác nhận (Xác thực COD)</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input 
                  className="input-field" 
                  placeholder="Nhập 4 số bất kỳ để xác thực" 
                  value={codOtp} 
                  onChange={e => setCodOtp(e.target.value.replace(/\D/g, ''))}
                  maxLength={4}
                />
                <button type="button" className="btn-secondary" onClick={() => addToast('Mã xác thực đã được gửi đến SĐT của bạn (Giả lập)')} style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>Gửi lại mã</button>
              </div>
            </div>
          ) : (
            <p style={{ marginTop: 0, marginBottom: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Bạn sẽ được chuyển đến trang thanh toán {formData.paymentMethod} để xác thực mã PIN và kiểm tra tài khoản.
            </p>
          )}
          <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }}>
            {loading ? 'Đang xử lý...' : `Xác nhận đặt hàng (${formatPrice(getTotal())})`}
          </button>
        </form>

        <div>
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 600 }}>Đơn hàng của bạn</h3>
            {items.map(item => (
              <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '14px' }}>
                <span>{item.product.name} x {item.quantity}</span>
                <span>{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
