'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

interface SellerOrderItem {
  id: string;
  quantity: number;
  price: number;
  product: { name: string; emoji?: string | null };
}

interface SellerOrder {
  id: string;
  status: string;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  total: number;
  trackingNumber?: string | null;
  createdAt: string;
  user?: { name: string; email: string } | null;
  orderItems: SellerOrderItem[];
}

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const addToast = useToastStore(s => s.addToast);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seller/orders');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast(data.error || 'Không thể tải đơn hàng.');
        setOrders([]);
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      addToast('Không thể tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = filterStatus === 'all'
    ? orders
    : orders.filter(o => o.status === filterStatus);

  const sellerTotal = (order: SellerOrder) =>
    order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      pending: 'Chờ xử lý',
      processing: 'Đang chuẩn bị',
      shipped: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };
    return map[status] || status;
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0 }}>Đơn hàng cửa hàng</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Các đơn có sản phẩm thuộc shop của bạn
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xử lý' },
            { id: 'processing', label: 'Chuẩn bị' },
            { id: 'shipped', label: 'Đang giao' },
            { id: 'delivered', label: 'Đã giao' },
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              style={{
                padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                background: filterStatus === tab.id ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                color: 'white', fontWeight: 600, fontSize: '13px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang tải...</p>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '16px' }}>
          Chưa có đơn hàng nào cho sản phẩm của bạn.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filtered.map(order => (
            <div
              key={order.id}
              style={{
                padding: '20px', borderRadius: '16px',
                background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>#{order.id.slice(-6).toUpperCase()}</span>
                  <span style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {new Date(order.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.06)' }}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <p style={{ margin: '0 0 6px', fontSize: '14px' }}>
                <strong>{order.customerName}</strong> · {order.customerPhone}
              </p>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>📍 {order.shippingAddress}</p>

              <div style={{ marginBottom: '12px' }}>
                {order.orderItems.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span>{item.product.emoji || '📦'} {item.product.name} × {item.quantity}</span>
                    <span>{formatPrice(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Thanh toán: {order.paymentMethod}
                  {order.trackingNumber ? ` · Mã vận đơn: ${order.trackingNumber}` : ''}
                </span>
                <strong style={{ color: 'var(--accent)' }}>{formatPrice(sellerTotal(order))}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
