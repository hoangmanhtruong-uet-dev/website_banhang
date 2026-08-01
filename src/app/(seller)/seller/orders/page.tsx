'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';
import { useToastStore } from '@/components/ui/Toast';

interface SellerFulfillment {
  id: string;
  status: string;
  total: string;
  trackingNumber?: string | null;
  createdAt: string;
  shipper?: { id: string; name: string; phone?: string | null } | null;
  order: {
    id: string;
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    paymentMethod: string;
    paymentStatus: string;
    createdAt: string;
  };
  orderItems: Array<{
    id: string;
    quantity: number;
    price: string;
    product: { id: string; name: string; emoji?: string | null };
  }>;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Chờ thanh toán', paid: 'Chờ xác nhận', confirmed: 'Đã xác nhận',
  packing: 'Đang đóng gói', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};

const FILTERS = [
  ['all', 'Tất cả'], ['paid', 'Chờ xác nhận'], ['confirmed', 'Đã xác nhận'],
  ['packing', 'Đóng gói'], ['shipping', 'Đang giao'], ['delivered', 'Đã giao'],
] as const;

export default function SellerOrdersPage() {
  const [fulfillments, setFulfillments] = useState<SellerFulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const addToast = useToastStore((state) => state.addToast);

  const fetchFulfillments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/seller/orders', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Không thể tải đơn hàng');
      setFulfillments(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể tải đơn hàng');
      setFulfillments([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void fetchFulfillments(); }, [fetchFulfillments]);

  const updateFulfillment = async (fulfillment: SellerFulfillment, action: 'confirm' | 'pack') => {
    setUpdatingId(fulfillment.id);
    try {
      const response = await fetch(`/api/seller/fulfillments/${fulfillment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({ action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(message || 'Không thể cập nhật kiện hàng');
      }
      addToast(action === 'confirm' ? 'Đã xác nhận đơn hàng' : 'Đã chuyển sang đóng gói');
      await fetchFulfillments();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể cập nhật kiện hàng');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = useMemo(() => filterStatus === 'all'
    ? fulfillments
    : fulfillments.filter((item) => item.status === filterStatus), [filterStatus, fulfillments]);

  return (
    <div>
      <div style={{ marginBottom: 30 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Đơn hàng của shop</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Xác nhận và đóng gói riêng phần hàng thuộc shop của bạn.</p>
        <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
          {FILTERS.map(([id, label]) => (
            <button key={id} type="button" onClick={() => setFilterStatus(id)} style={{
              padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: filterStatus === id ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: 'white', fontWeight: 600,
            }}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ textAlign: 'center', padding: 40 }}>Đang tải...</p> : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 50, textAlign: 'center', color: 'var(--text-muted)' }}>Không có kiện hàng phù hợp.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filtered.map((fulfillment) => (
            <div key={fulfillment.id} className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                <div>
                  <strong style={{ color: 'var(--accent)' }}>#{fulfillment.order.id.slice(-6).toUpperCase()}</strong>
                  <span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 12 }}>
                    Kiện {fulfillment.id.slice(-6).toUpperCase()} · {new Date(fulfillment.order.createdAt).toLocaleString('vi-VN')}
                  </span>
                </div>
                <strong>{STATUS_LABEL[fulfillment.status] || fulfillment.status}</strong>
              </div>
              <p style={{ margin: '0 0 6px' }}><strong>{fulfillment.order.customerName}</strong> · {fulfillment.order.customerPhone}</p>
              <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>📍 {fulfillment.order.shippingAddress}</p>
              {fulfillment.orderItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>{item.product.emoji || '📦'} {item.product.name} × {item.quantity}</span>
                  <span>{formatPrice(multiplyMoneyByQuantity(item.price, item.quantity))}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 12 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  {fulfillment.trackingNumber ? `Mã vận đơn: ${fulfillment.trackingNumber}` : fulfillment.shipper ? `Shipper: ${fulfillment.shipper.name}` : 'Chưa có shipper'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <strong style={{ color: 'var(--accent)' }}>{formatPrice(fulfillment.total)}</strong>
                  {fulfillment.status === 'paid' && (
                    <button className="btn-primary" disabled={updatingId === fulfillment.id} onClick={() => void updateFulfillment(fulfillment, 'confirm')}>Xác nhận đơn</button>
                  )}
                  {fulfillment.status === 'confirmed' && (
                    <button className="btn-primary" disabled={updatingId === fulfillment.id} onClick={() => void updateFulfillment(fulfillment, 'pack')}>Bắt đầu đóng gói</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
