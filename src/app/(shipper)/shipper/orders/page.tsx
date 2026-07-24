'use client';

import React, { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';
import { multiplyMoneyByQuantity } from '@/lib/utils/client-money';

interface OrderItem {
  id: string;
  quantity: number;
  price: string;
  product: { name: string; price: string; image?: string | null; emoji?: string | null };
}

interface ShipperInfo {
  id: string;
  name: string;
  phone?: string | null;
}

interface ShipperOrder {
  id: string;
  status: string;
  trackingNumber?: string | null;
  shippingProvider?: string | null;
  estimatedDelivery?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod: string;
  paymentStatus: string;
  shippingFee: string;
  total: string;
  shipperId?: string | null;
  shipper?: ShipperInfo | null;
  orderItems: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: '⏳ Chờ xử lý',   color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  PENDING:    { label: '⏳ Chờ xử lý',   color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
  processing: { label: '🔄 Đang xử lý',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  PROCESSING: { label: '🔄 Đang xử lý',  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
  shipped:    { label: '🚚 Đang giao',    color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  SHIPPED:    { label: '🚚 Đang giao',    color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  delivered:  { label: '✅ Đã giao',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  DELIVERED:  { label: '✅ Đã giao',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
  cancelled:  { label: '❌ Đã hủy',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  CANCELLED:  { label: '❌ Đã hủy',       color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};

const STATUS_OPTIONS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const FILTER_OPTIONS = ['ALL', ...STATUS_OPTIONS];

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#9898a6', bg: 'rgba(152,152,166,0.12)' };
  return (
    <span style={{
      padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
      color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap',
    }}>
      {cfg.label}
    </span>
  );
}

export default function ShipperOrdersPage() {
  const [orders, setOrders] = useState<ShipperOrder[]>([]);
  const [filtered, setFiltered] = useState<ShipperOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<ShipperOrder | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form cập nhật
  const [editStatus, setEditStatus] = useState('');
  const [editTracking, setEditTracking] = useState('');
  const [editProvider, setEditProvider] = useState('');
  const [editEstDelivery, setEditEstDelivery] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/shipper/orders');
      if (!res.ok) throw new Error('Không thể tải đơn hàng');
      const data = await res.json();
      setOrders(data);
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    let list = [...orders];
    if (filterStatus !== 'ALL') {
      list = list.filter(o => o.status.toUpperCase() === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerPhone.includes(q) ||
        (o.trackingNumber || '').toLowerCase().includes(q)
      );
    }
    setFiltered(list);
  }, [orders, filterStatus, search]);

  const openDetail = (order: ShipperOrder) => {
    setSelectedOrder(order);
    setEditStatus(order.status.toUpperCase());
    setEditTracking(order.trackingNumber || '');
    setEditProvider(order.shippingProvider || '');
    setEditEstDelivery(
      order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toISOString().slice(0, 10)
        : ''
    );
    setDetailOpen(true);
  };

  const handleUpdate = async (assignSelf = false) => {
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        status: editStatus,
        trackingNumber: editTracking,
        shippingProvider: editProvider,
        assignSelf,
      };
      if (editEstDelivery) body.estimatedDelivery = editEstDelivery;

      const res = await fetch(`/api/shipper/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Cập nhật thất bại');
      showToast('✓ Cập nhật thành công');
      setDetailOpen(false);
      fetchOrders();
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => ['pending','PENDING'].includes(o.status)).length,
    shipped: orders.filter(o => ['shipped','SHIPPED'].includes(o.status)).length,
    delivered: orders.filter(o => ['delivered','DELIVERED'].includes(o.status)).length,
  };

  return (
    <div className="page-container" style={{ maxWidth: '1400px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
          background: toast.type === 'success' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${toast.type === 'success' ? '#22c55e' : '#ef4444'}`,
          color: toast.type === 'success' ? '#22c55e' : '#ef4444',
          padding: '14px 24px', borderRadius: '12px', fontWeight: 600, fontSize: '14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'fadeInUp 0.3s ease-out',
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span style={{ fontSize: '32px' }}>🚚</span>
          <h1 style={{ fontSize: '30px', fontWeight: 800, color: 'var(--text-primary)' }}>
            Cổng Quản Lý Giao Hàng
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          Theo dõi và cập nhật tình trạng tất cả đơn hàng
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
        {[
          { label: 'Tổng đơn', value: stats.total, icon: '📦', color: '#f59e0b' },
          { label: 'Chờ xử lý', value: stats.pending, icon: '⏳', color: '#eab308' },
          { label: 'Đang giao', value: stats.shipped, icon: '🚚', color: '#a855f7' },
          { label: 'Đã giao', value: stats.delivered, icon: '✅', color: '#22c55e' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="🔍  Tìm mã đơn, tên KH, SĐT, tracking..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field"
          style={{ flex: 1, minWidth: '260px', maxWidth: '420px' }}
        />
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(f => {
            const cfg = STATUS_CONFIG[f];
            const isActive = filterStatus === f;
            return (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                style={{
                  padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', border: '1px solid',
                  background: isActive ? (cfg ? cfg.bg : 'var(--bg-card-hover)') : 'transparent',
                  color: isActive ? (cfg ? cfg.color : 'var(--accent)') : 'var(--text-muted)',
                  borderColor: isActive ? (cfg ? cfg.color : 'var(--accent)') : 'var(--border)',
                  transition: 'all 0.2s',
                }}
              >
                {f === 'ALL' ? '📋 Tất cả' : (cfg?.label || f)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⏳</div>
          Đang tải dữ liệu đơn hàng...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: '80px', textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>📭</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>Không có đơn hàng nào</p>
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'auto' }}>
          <table className="data-table" style={{ minWidth: '960px' }}>
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Khách Hàng</th>
                <th>Địa Chỉ</th>
                <th>Tổng Tiền</th>
                <th>Shipper</th>
                <th>Ngày Nhận DK</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'center' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(o)}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '13px' }}>
                      #{o.id.slice(-8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>{o.customerName}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.customerPhone}</div>
                  </td>
                  <td style={{ fontSize: '13px', maxWidth: '220px', color: 'var(--text-secondary)' }}>
                    {o.shippingAddress}
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--success)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                    {formatPrice(o.total)}
                  </td>
                  <td>
                    {o.shipper ? (
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent)' }}>
                          🧑‍💼 {o.shipper.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{o.shipper.phone}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chưa giao</span>
                    )}
                  </td>
                  <td style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {o.estimatedDelivery
                      ? new Date(o.estimatedDelivery).toLocaleDateString('vi-VN')
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td><StatusBadge status={o.status} /></td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => openDetail(o)}
                      className="btn-primary"
                      style={{ padding: '6px 16px', fontSize: '13px' }}
                    >
                      Cập nhật
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail/Edit Modal */}
      {detailOpen && selectedOrder && (
        <div
          className="modal-overlay"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="modal-content"
            style={{ maxWidth: '680px', width: '95%' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '6px' }}>
                  📦 Đơn #{selectedOrder.id.slice(-8).toUpperCase()}
                </h2>
                <StatusBadge status={selectedOrder.status} />
              </div>
              <button
                onClick={() => setDetailOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '22px', lineHeight: 1 }}
              >×</button>
            </div>

            {/* Thông tin khách hàng */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              padding: '16px', marginBottom: '20px', fontSize: '14px',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Thông Tin Khách Hàng
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Họ tên: </span><strong>{selectedOrder.customerName}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>SĐT: </span><strong>{selectedOrder.customerPhone}</strong></div>
                <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--text-muted)' }}>Địa chỉ: </span>{selectedOrder.shippingAddress}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Thanh toán: </span>{selectedOrder.paymentMethod}</div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>TT TT: </span>
                  <span style={{ color: selectedOrder.paymentStatus === 'paid' ? '#22c55e' : '#eab308', fontWeight: 600 }}>
                    {selectedOrder.paymentStatus === 'paid' ? '✅ Đã thanh toán' : '⏳ Chưa thanh toán'}
                  </span>
                </div>
                <div><span style={{ color: 'var(--text-muted)' }}>Tổng tiền: </span><strong style={{ color: 'var(--accent)' }}>{formatPrice(selectedOrder.total)}</strong></div>
                {selectedOrder.deliveredAt && (
                  <div><span style={{ color: 'var(--text-muted)' }}>Đã giao: </span><strong style={{ color: '#22c55e' }}>{new Date(selectedOrder.deliveredAt).toLocaleDateString('vi-VN')}</strong></div>
                )}
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div style={{
              background: 'var(--bg-card)', borderRadius: 'var(--radius-md)',
              padding: '16px', marginBottom: '20px',
            }}>
              <div style={{ fontWeight: 700, marginBottom: '10px', color: 'var(--text-secondary)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Sản Phẩm ({selectedOrder.orderItems.length})
              </div>
              {selectedOrder.orderItems.map(item => (
                <div key={item.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{item.product.emoji || '📦'}</span>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.product.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>x{item.quantity}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{formatPrice(multiplyMoneyByQuantity(item.price, item.quantity))}</div>
                </div>
              ))}
            </div>

            {/* Form cập nhật */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
              <div>
                <label className="input-label">Trạng thái đơn hàng</label>
                <select value={editStatus} onChange={e => setEditStatus(e.target.value)} className="input-field">
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="input-label">📅 Ngày nhận dự kiến</label>
                <input
                  type="date"
                  value={editEstDelivery}
                  onChange={e => setEditEstDelivery(e.target.value)}
                  className="input-field"
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>

              <div>
                <label className="input-label">Mã vận đơn (Tracking)</label>
                <input
                  value={editTracking}
                  onChange={e => setEditTracking(e.target.value)}
                  className="input-field"
                  placeholder="VD: VN123456789"
                />
              </div>

              <div>
                <label className="input-label">Đơn vị vận chuyển</label>
                <select value={editProvider} onChange={e => setEditProvider(e.target.value)} className="input-field">
                  <option value="">-- Chọn đơn vị --</option>
                  <option value="GHN">GHN - Giao Hàng Nhanh</option>
                  <option value="GHTK">GHTK - Giao Hàng Tiết Kiệm</option>
                  <option value="VNPost">Vietnam Post</option>
                  <option value="JT">J&T Express</option>
                  <option value="Ninja">Ninja Van</option>
                  <option value="Shopee">Shopee Express</option>
                  <option value="Other">Khác</option>
                </select>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleUpdate(false)}
                disabled={saving}
                className="btn-primary"
                style={{ flex: 1, justifyContent: 'center' }}
              >
                {saving ? '⏳ Đang lưu...' : '💾 Lưu cập nhật'}
              </button>
              {!selectedOrder.shipperId && (
                <button
                  onClick={() => handleUpdate(true)}
                  disabled={saving}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  🧑‍💼 Nhận đơn này
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
