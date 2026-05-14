'use client';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { orderSchema } from '@/lib/validations';
import { useToastStore } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const { items, getTotal, clearCart } = useCartStore();
  const addToast = useToastStore(s => s.addToast);
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<{
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: 'COD' | 'Banking' | 'MoMo';
  }>({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: '',
    paymentMethod: 'COD',
  });

  if (items.length === 0) {
    router.push('/cart');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Validate dữ liệu bằng Zod
      orderSchema.parse(formData);

      // 2. Gửi API tạo đơn hàng
      const orderItems = items.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        price: item.product.price, // Lưu giá tại thời điểm đặt hàng
      }));

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, items: orderItems }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Lỗi khi tạo đơn hàng');
      }

      addToast('Đặt hàng thành công! Đơn hàng đang được xử lý. 🎉');
      clearCart();
      router.push('/');
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label className="input-label">Họ và tên</label>
              <input className="input-field" value={formData.customerName} 
                onChange={e => setFormData({...formData, customerName: e.target.value})} required />
            </div>
            <div>
              <label className="input-label">Số điện thoại</label>
              <input className="input-field" value={formData.customerPhone} 
                onChange={e => setFormData({...formData, customerPhone: e.target.value})} required />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label className="input-label">Email</label>
            <input className="input-field" type="email" value={formData.customerEmail} 
              onChange={e => setFormData({...formData, customerEmail: e.target.value})} required />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label className="input-label">Địa chỉ nhận hàng</label>
            <textarea className="input-field" style={{ minHeight: '100px' }} value={formData.shippingAddress} 
              onChange={e => setFormData({...formData, shippingAddress: e.target.value})} required />
          </div>
          
          <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Phương thức thanh toán</h3>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
            {(['COD', 'Banking', 'MoMo'] as const).map((method) => (
              <button key={method} type="button" 
                onClick={() => setFormData({...formData, paymentMethod: method})}
                style={{ 
                  flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                  background: formData.paymentMethod === method ? 'var(--accent)' : 'transparent',
                  color: formData.paymentMethod === method ? 'white' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {method}
              </button>
            ))}
          </div>
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