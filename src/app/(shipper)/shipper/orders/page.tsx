'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';
import { useToastStore } from '@/components/ui/Toast';

interface ShipperFulfillment {
  id: string;
  status: 'packing' | 'shipping' | 'delivered';
  assignment: 'available' | 'mine';
  total: string;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  seller?: { id: string; name: string; phone?: string | null } | null;
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
  packing: 'Sẵn sàng lấy hàng', shipping: 'Đang giao', delivered: 'Đã giao',
};

export default function ShipperOrdersPage() {
  const [fulfillments, setFulfillments] = useState<ShipperFulfillment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'available' | 'mine' | 'all'>('available');
  const [selected, setSelected] = useState<ShipperFulfillment | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingProvider, setShippingProvider] = useState('Nội bộ');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const addToast = useToastStore((state) => state.addToast);

  const fetchFulfillments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/shipper/orders', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Không thể tải kiện giao hàng');
      setFulfillments(Array.isArray(data) ? data : []);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể tải kiện giao hàng');
      setFulfillments([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { void fetchFulfillments(); }, [fetchFulfillments]);

  const transition = async (fulfillment: ShipperFulfillment, status: 'SHIPPING' | 'DELIVERED', assignSelf = false) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/shipper/orders/${fulfillment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() },
        body: JSON.stringify({
          status, assignSelf,
          ...(trackingNumber.trim() ? { trackingNumber: trackingNumber.trim() } : {}),
          ...(shippingProvider.trim() ? { shippingProvider: shippingProvider.trim() } : {}),
          ...(estimatedDelivery ? { estimatedDelivery: new Date(`${estimatedDelivery}T12:00:00+07:00`).toISOString() } : {}),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = typeof data.error === 'string' ? data.error : data.error?.message;
        throw new Error(message || 'Không thể cập nhật kiện hàng');
      }
      addToast(status === 'DELIVERED' ? 'Đã xác nhận giao hàng thành công' : 'Đã nhận kiện và bắt đầu giao');
      setSelected(null);
      setTrackingNumber('');
      setEstimatedDelivery('');
      setTab('mine');
      await fetchFulfillments();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Không thể cập nhật kiện hàng');
    } finally {
      setSaving(false);
    }
  };

  const openAccept = (fulfillment: ShipperFulfillment) => {
    setSelected(fulfillment);
    setTrackingNumber(`MT-${fulfillment.id.slice(-8).toUpperCase()}`);
    const tomorrow = new Date(Date.now() + 86_400_000);
    setEstimatedDelivery(tomorrow.toISOString().slice(0, 10));
  };

  const filtered = useMemo(() => tab === 'all' ? fulfillments : fulfillments.filter((item) => item.assignment === tab), [fulfillments, tab]);
  const availableCount = fulfillments.filter((item) => item.assignment === 'available').length;
  const shippingCount = fulfillments.filter((item) => item.assignment === 'mine' && item.status === 'shipping').length;
  const deliveredCount = fulfillments.filter((item) => item.assignment === 'mine' && item.status === 'delivered').length;

  return (
    <div className="page-container" style={{ paddingBottom: 60 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>Cổng giao hàng</h1>
        <p style={{ color: 'var(--text-muted)' }}>Chỉ hiển thị kiện sẵn sàng nhận và kiện đang thuộc bạn.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[['Kiện có thể nhận', availableCount], ['Đang giao', shippingCount], ['Đã giao', deliveredCount]].map(([label, value]) => (
          <div key={String(label)} className="glass-card" style={{ padding: 20 }}><strong style={{ fontSize: 26 }}>{value}</strong><div style={{ color: 'var(--text-muted)' }}>{label}</div></div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['available', 'Có thể nhận'], ['mine', 'Đơn của tôi'], ['all', 'Tất cả']] as const).map(([id, label]) => (
          <button key={id} className={tab === id ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 60 }}>Đang tải...</div> : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>Không có kiện giao hàng phù hợp.</div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {filtered.map((fulfillment) => (
            <div key={fulfillment.id} className="glass-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 12 }}>
                <div><strong style={{ color: 'var(--accent)' }}>#{fulfillment.order.id.slice(-6).toUpperCase()}</strong><span style={{ marginLeft: 10, color: 'var(--text-muted)', fontSize: 12 }}>Kiện {fulfillment.id.slice(-6).toUpperCase()}</span></div>
                <strong>{STATUS_LABEL[fulfillment.status]}</strong>
              </div>
              <p style={{ margin: '0 0 6px' }}><strong>Shop:</strong> {fulfillment.seller?.name || 'Gian hàng hệ thống'}</p>
              <p style={{ margin: '0 0 6px' }}><strong>Khách:</strong> {fulfillment.order.customerName} · {fulfillment.order.customerPhone}</p>
              <p style={{ margin: '0 0 12px', color: 'var(--text-muted)' }}>📍 {fulfillment.order.shippingAddress}</p>
              {fulfillment.orderItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span>{item.product.emoji || '📦'} {item.product.name} × {item.quantity}</span>
                  <span>{formatPrice(multiplyMoneyByQuantity(item.price, item.quantity))}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 12 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>{fulfillment.trackingNumber ? `Mã vận đơn: ${fulfillment.trackingNumber}` : 'Chưa tạo mã vận đơn'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <strong style={{ color: 'var(--accent)' }}>{formatPrice(fulfillment.total)}</strong>
                  {fulfillment.assignment === 'available' && fulfillment.status === 'packing' && <button className="btn-primary" onClick={() => openAccept(fulfillment)}>Nhận kiện</button>}
                  {fulfillment.assignment === 'mine' && fulfillment.status === 'shipping' && <button className="btn-primary" disabled={saving} onClick={() => void transition(fulfillment, 'DELIVERED')}>Đã giao hàng</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => !saving && setSelected(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(event) => event.stopPropagation()}>
            <h2 style={{ marginBottom: 8 }}>Nhận kiện #{selected.id.slice(-6).toUpperCase()}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Thông tin khách hàng sẽ được mở đầy đủ sau khi nhận kiện thành công.</p>
            <label className="input-label">Mã vận đơn</label>
            <input className="input-field" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value)} />
            <label className="input-label" style={{ marginTop: 14 }}>Đơn vị vận chuyển</label>
            <input className="input-field" value={shippingProvider} onChange={(event) => setShippingProvider(event.target.value)} />
            <label className="input-label" style={{ marginTop: 14 }}>Ngày giao dự kiến</label>
            <input type="date" className="input-field" value={estimatedDelivery} onChange={(event) => setEstimatedDelivery(event.target.value)} />
            <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
              <button className="btn-secondary" disabled={saving} onClick={() => setSelected(null)}>Hủy</button>
              <button className="btn-primary" disabled={saving || !trackingNumber.trim()} onClick={() => void transition(selected, 'SHIPPING', true)}>{saving ? 'Đang nhận...' : 'Xác nhận nhận kiện'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
