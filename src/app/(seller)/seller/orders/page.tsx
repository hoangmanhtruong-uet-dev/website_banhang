'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/seller/orders')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setOrders(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Quản Lý Đơn Hàng</h1>
        <p style={{ color: 'var(--text-muted)' }}>Theo dõi và xử lý các đơn hàng khách đã đặt từ gian hàng của bạn.</p>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left' }}>MÃ ĐƠN / KHÁCH HÀNG</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>SẢN PHẨM</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>TỔNG TIỀN</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>TRẠNG THÁI</th>
              <th style={{ padding: '20px', textAlign: 'right' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải đơn hàng...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có đơn hàng nào cho sản phẩm của bạn.</td></tr>
            ) : orders.map((order: any) => (
              <tr key={order.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <td style={{ padding: '20px' }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>#{order.id.slice(-8).toUpperCase()}</p>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{order.user?.name}</span>
                </td>
                <td style={{ padding: '20px' }}>
                  {order.items.map((item: any) => (
                    <div key={item.id} style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span>{item.product.emoji}</span>
                      <span>x{item.quantity} {item.product.name}</span>
                    </div>
                  ))}
                </td>
                <td style={{ padding: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                  {formatPrice(order.total)}
                </td>
                <td style={{ padding: '20px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '12px', fontWeight: 600 }}>
                    Chờ xử lý
                  </span>
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <button className="btn-secondary" style={{ padding: '8px 15px', fontSize: '12px' }}>Xác nhận</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
