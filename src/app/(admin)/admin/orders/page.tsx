'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link'; // Import Link
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
    } catch (error) {
      console.error('Error fetching admin orders:', error);
      addToast('Lỗi khi lấy dữ liệu đơn hàng.'); // Hiển thị toast khi có lỗi
    } finally {
      setLoading(false);
    }
  };

  // Hàm lấy màu sắc cho trạng thái
  const getStatusColor = (status: string) => {
    if (status === 'delivered') return '#10b981'; // Green
    if (status === 'cancelled') return '#ef4444'; // Red
    return '#f59e0b'; // Orange for pending, processing, shipped
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      let trackingNumber = null;
      if (newStatus === 'shipped') {
        // Tự động tạo mã vận đơn form PR + 5 ký tự ngẫu nhiên từ ID
        trackingNumber = `PR${orderId.slice(-5).toUpperCase()}`;
      }

      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, trackingNumber }),
      });
      if (res.ok) {
        let message = `Đã chuyển đơn hàng sang ${newStatus.toUpperCase()} ✨`;
        if (trackingNumber) {
          message += ` (Mã vận đơn tự động: ${trackingNumber})`;
        }
        addToast(message);
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
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>MÃ VẬN ĐƠN</th>
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
                  <p style={{ margin: 0, fontWeight: 700 }}>IDR{o.id.slice(-5).toUpperCase()}</p>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{o.customerName}</span>
                </td>
                <td style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {new Date(o.createdAt).toLocaleString('vi-VN')}
                </td>
                <td style={{ padding: '20px', fontSize: '13px', color: 'rgba(255,255,255,0.6)' }}>
                  {o.trackingNumber || 'Chưa có'}
                </td>
                <td style={{ padding: '20px', fontWeight: 700, color: 'var(--accent)' }}>{formatPrice(o.total)}</td>
                <td style={{ padding: '20px' }}>
                  <select 
                    value={(o.status || 'pending').toLowerCase()} 
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    style={{ 
                      padding: '6px 12px', borderRadius: '10px', fontSize: '11px', fontWeight: 700, border: 'none',
                      background: `rgba(255,255,255,0.05)`, color: getStatusColor((o.status || 'pending').toLowerCase()),
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
                  <Link href={`/admin/orders/${o.id}`} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', textDecoration: 'none' }}>
                    Xem Chi Tiết
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
