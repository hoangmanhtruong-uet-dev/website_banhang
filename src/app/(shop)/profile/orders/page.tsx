'use client';

import { useCallback, useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';
import { useToastStore } from '@/components/ui/Toast';

interface OrderItemData {
  id: string;
  quantity: number;
  price: string;
  product: { name: string; emoji: string; gradient: string };
}

interface OrderData {
  id: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: string;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  createdAt: string;
  orderItems: OrderItemData[];
}

const statusInfo: Record<string, { label: string; color: string }> = {
  pending: { label: 'Chờ xử lý', color: '#fbbf24' },
  paid: { label: 'Đã thanh toán', color: '#22c55e' },
  confirmed: { label: 'Đã xác nhận', color: '#3b82f6' },
  packing: { label: 'Đang đóng gói', color: '#60a5fa' },
  processing: { label: 'Đang xử lý', color: '#60a5fa' },
  shipping: { label: 'Đang giao', color: '#a855f7' },
  shipped: { label: 'Đang giao', color: '#a855f7' },
  delivered: { label: 'Đã giao', color: '#10b981' },
  cancelled: { label: 'Đã hủy', color: '#ef4444' },
  expired: { label: 'Đã hết hạn', color: '#64748b' },
  payment_failed: { label: 'Thanh toán thất bại', color: '#ef4444' },
  payment_review: { label: 'Đang kiểm tra thanh toán', color: '#f97316' },
  return_requested: { label: 'Đã yêu cầu trả hàng', color: '#f97316' },
  return_approved: { label: 'Đã duyệt trả hàng', color: '#22c55e' },
  return_rejected: { label: 'Từ chối trả hàng', color: '#ef4444' },
  returning: { label: 'Đang hoàn hàng', color: '#a855f7' },
  returned: { label: 'Đã hoàn hàng', color: '#64748b' },
  refund_pending: { label: 'Đang hoàn tiền', color: '#f97316' },
  refunded: { label: 'Đã hoàn tiền', color: '#10b981' },
};

function getStatusInfo(status: string) {
  return statusInfo[status] || { label: status, color: 'var(--text-muted)' };
}

export default function UserOrdersPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyOrderId, setBusyOrderId] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState('');
  const addToast = useToastStore(state => state.addToast);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/me/orders');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Không thể tải đơn hàng');
      setOrders(Array.isArray(data) ? data : []);
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể tải đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const postOrderAction = async (orderId: string, action: 'cancel' | 'returns', body?: object) => {
    setBusyOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || data.error || 'Không thể cập nhật đơn hàng');
      addToast(action === 'cancel' ? 'Đã hủy đơn hàng.' : 'Đã gửi yêu cầu trả hàng.');
      await fetchOrders();
    } catch (caught) {
      addToast(caught instanceof Error ? caught.message : 'Không thể cập nhật đơn hàng');
    } finally {
      setBusyOrderId('');
    }
  };

  const requestReturn = (orderId: string) => {
    const reason = window.prompt('Nhập lý do trả hàng:')?.trim();
    if (reason && reason.length >= 3) {
      postOrderAction(orderId, 'returns', { reason });
    } else if (reason !== undefined && reason !== null) {
      addToast('Lý do trả hàng phải có ít nhất 3 ký tự.');
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
          {orders.map(order => {
            const status = getStatusInfo(order.status);
            const expanded = expandedOrderId === order.id;
            return (
              <article key={order.id} style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '20px', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>Mã đơn hàng</p>
                    <p style={{ fontWeight: 700, fontSize: '15px' }}>#{order.id.slice(-8).toUpperCase()}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>Thanh toán: {order.paymentMethod}</p>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, padding: '6px 12px', borderRadius: '20px', background: `${status.color}20`, color: status.color }}>
                    {status.label}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  {order.orderItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: item.product.gradient || 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{item.product.emoji}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '14px' }}>{item.product.name}</p>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Số lượng: {item.quantity}</p>
                      </div>
                      <p style={{ fontWeight: 600 }}>{formatPrice(multiplyMoneyByQuantity(item.price, item.quantity))}</p>
                    </div>
                  ))}
                </div>

                {expanded && (
                  <div style={{ padding: '16px', marginBottom: '18px', borderRadius: '14px', background: 'rgba(255,255,255,0.03)', color: 'var(--text-muted)', fontSize: '13px', lineHeight: 1.7 }}>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Người nhận:</strong> {order.customerName} · {order.customerPhone}</p>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Email:</strong> {order.customerEmail}</p>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Địa chỉ:</strong> {order.shippingAddress}</p>
                    <p><strong style={{ color: 'var(--text-primary)' }}>Thanh toán:</strong> {order.paymentStatus}</p>
                    {order.shippingProvider && <p><strong style={{ color: 'var(--text-primary)' }}>Đơn vị vận chuyển:</strong> {order.shippingProvider}</p>}
                    {order.trackingNumber && <p><strong style={{ color: 'var(--text-primary)' }}>Mã vận đơn:</strong> {order.trackingNumber}</p>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</p>
                    <button type="button" onClick={() => setExpandedOrderId(expanded ? '' : order.id)} style={{ background: 'none', border: 0, padding: 0, marginTop: '6px', color: 'var(--accent)', cursor: 'pointer' }}>
                      {expanded ? 'Thu gọn' : 'Xem chi tiết'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {order.status === 'pending' && (
                      <button type="button" className="btn-danger" disabled={busyOrderId === order.id} onClick={() => {
                        if (window.confirm('Bạn chắc chắn muốn hủy đơn hàng này?')) postOrderAction(order.id, 'cancel');
                      }}>
                        Hủy đơn
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <button type="button" className="btn-secondary" disabled={busyOrderId === order.id} onClick={() => requestReturn(order.id)}>
                        Yêu cầu trả hàng
                      </button>
                    )}
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tổng thanh toán</p>
                      <p style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>{formatPrice(order.total)}</p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}