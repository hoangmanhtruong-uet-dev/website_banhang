'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';
interface OrderItemData {
  id: string;
  quantity: number;
  price: string;
  product: { name: string; emoji: string; gradient: string; };
}

interface OrderData {
  id: string;
  status: string;
  paymentMethod: string;
  shippingAddress: string;
  total: string;
  createdAt: string;
  orderItems: OrderItemData[];
}

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/me/orders')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#fbbf24';
      case 'processing': return '#60a5fa';
      case 'shipped': return '#a855f7';
      case 'delivered': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return 'var(--text-muted)';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Chờ xử lý';
      case 'processing': return 'Đang xử lý';
      case 'shipped': return 'Đang giao';
      case 'delivered': return 'Đã giao';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  return (
    <div className="glass-card" style={{ padding: '40px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px' }}>Đơn hàng của tôi</h1>

      {loading ? (
        <p>Đang tải đơn hàng...</p>
      ) : orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🛍️</span>
          <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có đơn hàng nào.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {orders.map((order) => (
            <div key={order.id} style={{ 
              padding: '24px', borderRadius: 'var(--radius-md)', 
              background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' 
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mã đơn hàng</p>
                  <p style={{ fontWeight: 700, fontSize: '15px' }}>#{order.id.slice(-8).toUpperCase()}</p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Thanh toán: {order.paymentMethod}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Trạng thái</p>
                  <span style={{ 
                    fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '20px',
                    background: `${getStatusColor(order.status)}20`, color: getStatusColor(order.status)
                  }}>
                    {getStatusText(order.status)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ padding: '16px', borderRadius: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '13px' }}>Địa chỉ giao hàng</p>
                  <p style={{ margin: '8px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>{order.shippingAddress}</p>
                </div>
                {order.orderItems.map((item: OrderItemData) => (
                  <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{ 
                      width: '48px', height: '48px', borderRadius: '8px', 
                      background: item.product.gradient || 'var(--bg-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px'
                    }}>
                      {item.product.emoji}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px' }}>{item.product.name}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số lượng: {item.quantity}</p>
                    </div>
                    <p style={{ fontWeight: 600 }}>{formatPrice(multiplyMoneyByQuantity(item.price, item.quantity))}</p>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                </p>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tổng thanh toán</p>
                  <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{formatPrice(order.total)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
