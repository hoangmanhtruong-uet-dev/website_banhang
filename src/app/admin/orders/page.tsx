'use client';
import { useState, useEffect, useCallback } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

const statusLabel: Record<string, string> = {
  pending: 'Chờ xử lý', processing: 'Đang xử lý',
  shipped: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy',
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Array<{id: string; status: string; customerName: string; customerEmail: string; customerPhone: string; shippingAddress: string; paymentMethod: string; total: number; createdAt: string}>>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const addToast = useToastStore(s => s.addToast);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/orders');
      if (res.ok) setOrders(await res.json());
    } catch {
      addToast('Lỗi khi tải đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
        addToast(`Cập nhật trạng thái thành công! ✅`);
      } else {
        addToast('Cập nhật thất bại');
      }
    } catch {
      addToast('Lỗi kết nối server');
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Quản lý Đơn hàng</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            {loading ? 'Đang tải...' : `${orders.length} đơn hàng trong hệ thống`}
          </p>
        </div>
      </div>

      <div className="glass-card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Mã đơn</th><th>Khách hàng</th><th>Địa chỉ</th>
              <th>Tổng tiền</th><th>TT Thanh toán</th><th>Trạng thái</th><th>Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>📋</span>
                Chưa có đơn hàng nào
              </td></tr>
            ) : orders.map(order => (
              <tr key={order.id} style={{ opacity: updating === order.id ? 0.6 : 1, transition: 'opacity 0.2s' }}>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '12px', fontFamily: 'monospace' }}>
                  {order.id.slice(0, 10)}...
                </td>
                <td>
                  <div style={{ fontWeight: 600 }}>{order.customerName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customerEmail}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.customerPhone}</div>
                </td>
                <td style={{ fontSize: '13px', maxWidth: '180px' }}>{order.shippingAddress}</td>
                <td style={{ fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(order.total)}</td>
                <td>
                  <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)' }}>
                    {order.paymentMethod}
                  </span>
                </td>
                <td>
                  <select
                    value={order.status}
                    disabled={updating === order.id}
                    onChange={e => handleStatusChange(order.id, e.target.value)}
                    className={`status-select status-${order.status}`}
                  >
                    {Object.entries(statusLabel).map(([key, val]) => (
                      <option key={key} value={key}>{val}</option>
                    ))}
                  </select>
                </td>
                <td style={{ fontSize: '13px' }}>{new Date(order.createdAt).toLocaleDateString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}