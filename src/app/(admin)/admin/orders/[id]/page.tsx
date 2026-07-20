'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';
import Link from 'next/link';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  product: {
    id: string;
    name: string;
    image?: string | null;
    emoji?: string | null;
  };
}

interface OrderDetail {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingFee: number;
  shippingProvider?: string | null;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  shipper?: {
    name: string;
    phone?: string | null;
    licensePlate?: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: '⏳ CHỜ XỬ LÝ', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  processing: { label: '🔄 ĐANG CHUẨN BỊ', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  shipped: { label: '🚚 ĐANG GIAO HÀNG', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  delivered: { label: '✅ ĐÃ GIAO HÀNG', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  cancelled: { label: '❌ ĐÃ HỦY ĐƠN', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState('pending');
  const [trackingNumber, setTrackingNumber] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const fetchOrderDetail = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng');
      const data = await res.json();
      setOrder(data);
      setStatus((data.status || 'pending').toLowerCase());
      setTrackingNumber(data.trackingNumber || '');
    } catch (err: any) {
      addToast(err.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [params.id]);

  const handleUpdateStatus = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${params.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, trackingNumber }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Cập nhật thất bại');
      }

      addToast('✅ Cập nhật trạng thái đơn hàng thành công!');
      fetchOrderDetail();
    } catch (err: any) {
      addToast(err.message || 'Lỗi cập nhật');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔄</div>
        Đang tải thông tin chi tiết đơn hàng...
      </div>
    );
  }

  if (!order) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
        <h2>Không tìm thấy đơn hàng!</h2>
        <button onClick={() => router.back()} className="btn-secondary" style={{ marginTop: '20px' }}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const currentStatusCfg = STATUS_LABELS[status] || STATUS_LABELS.pending;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Header Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <Link href="/admin/orders" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            ← Quay về danh sách đơn hàng
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 900, margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            Chi Tiết Đơn Hàng #{order.id.slice(-8).toUpperCase()}
            <span style={{ fontSize: '13px', padding: '6px 14px', borderRadius: '20px', background: currentStatusCfg.bg, color: currentStatusCfg.color, fontWeight: 700 }}>
              {currentStatusCfg.label}
            </span>
          </h1>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', textAlign: 'right' }}>
          Ngày đặt: {new Date(order.createdAt).toLocaleString('vi-VN')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Left Column: Items & Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Order Items */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              📦 Danh sách sản phẩm ({order.orderItems.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {order.orderItems.map((item) => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                      {item.product.emoji || '📦'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>{item.product.name}</div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                        {formatPrice(item.price)} × {item.quantity}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--accent)' }}>
                    {formatPrice(item.price * item.quantity)}
                  </div>
                </div>
              ))}
            </div>

            {/* Total summary */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                <span>Tiền hàng:</span>
                <span>{formatPrice(order.total - (order.shippingFee || 0))}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                <span>Phí vận chuyển:</span>
                <span>{formatPrice(order.shippingFee || 0)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 800, color: '#fff', marginTop: '6px' }}>
                <span>Tổng cộng:</span>
                <span style={{ color: 'var(--accent)' }}>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer & Shipping Details */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              👤 Thông tin khách hàng & Giao hàng
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', fontSize: '14px' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '12px' }}>Tên người nhận</span>
                <strong style={{ color: '#fff', fontSize: '15px' }}>{order.customerName}</strong>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '12px' }}>Số điện thoại</span>
                <strong style={{ color: '#fff', fontSize: '15px' }}>{order.customerPhone}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '12px' }}>Địa chỉ nhận hàng</span>
                <span style={{ color: '#fff', fontSize: '14px' }}>{order.shippingAddress}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '12px' }}>Phương thức thanh toán</span>
                <span style={{ color: '#fff' }}>{order.paymentMethod}</span>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.4)', display: 'block', fontSize: '12px' }}>Trạng thái thanh toán</span>
                <span style={{ color: order.paymentStatus === 'paid' ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                  {order.paymentStatus === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán (COD)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Management Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Update Status Panel */}
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px' }}>
              ⚡ Cập nhật trạng thái
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Trạng thái đơn hàng</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px', fontWeight: 600 }}
                >
                  <option value="pending">⏳ CHỜ XỬ LÝ</option>
                  <option value="processing">🔄 ĐANG CHUẨN BỊ</option>
                  <option value="shipped">🚚 ĐANG GIAO HÀNG</option>
                  <option value="delivered">✅ ĐÃ GIAO HÀNG</option>
                  <option value="cancelled">❌ ĐÃ HỦY ĐƠN</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '6px' }}>Mã vận đơn (Tracking Number)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Ví dụ: PR12345"
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '14px' }}
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                disabled={updating}
                style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: '14px', border: 'none', cursor: 'pointer', marginTop: '8px' }}
              >
                {updating ? 'Đang lưu...' : '💾 Lưu cập nhật'}
              </button>
            </div>
          </div>

          {/* Shipper Info if assigned */}
          {order.shipper && (
            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)', padding: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginTop: 0, marginBottom: '14px', color: '#a855f7' }}>
                🚚 Thông tin Shipper
              </h3>
              <div style={{ fontSize: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Họ tên: </span><strong>{order.shipper.name}</strong></div>
                <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>SĐT: </span><strong>{order.shipper.phone || 'Chưa cập nhật'}</strong></div>
                {order.shipper.licensePlate && (
                  <div><span style={{ color: 'rgba(255,255,255,0.4)' }}>Biển số xe: </span><strong>{order.shipper.licensePlate}</strong></div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
