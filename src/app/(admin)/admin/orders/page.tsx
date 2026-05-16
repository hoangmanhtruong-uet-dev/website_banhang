'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  const fetchOrders = async () => {
    try {
      const res = await fetch('/api/admin/orders');
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
    } catch {
      addToast('Lỗi khi lấy dữ liệu đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        addToast(`Đã chuyển đơn hàng sang ${newStatus.toUpperCase()} ✨`);
        fetchOrders();
      }
    } catch {
      addToast('Lỗi kết nối.');
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Toàn Bộ Đơn Hàng</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Quản lý và xử lý đơn hàng trên toàn hệ thống.</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>MÃ ĐƠN / KHÁCH</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>NGÀY ĐẶT</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>TỔNG TIỀN</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>TRẠNG THÁI</th>
              <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải danh sách đơn hàng...</td></tr>
            ) : orders.map((o: any) => (
              <tr key={o.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '20px' }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>#{o.id.slice(-8).toUpperCase()}</p>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{o.user?.name}</span>
                </td>
                <td style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {new Date(o.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td style={{ padding: '20px', fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(o.total)}</td>
                <td style={{ padding: '20px' }}>
                  <select 
                    value={o.status || 'pending'} 
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
                      background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)'
                    }}
                  >
                    <option value="pending">CHỜ XỬ LÝ</option>
                    <option value="processing">ĐANG CHUẨN BỊ</option>
                    <option value="shipped">ĐANG GIAO</option>
                    <option value="delivered">ĐÃ GIAO</option>
                    <option value="cancelled">ĐÃ HỦY</option>
                  </select>
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <button style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer' }}>Xem Chi Tiết</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
