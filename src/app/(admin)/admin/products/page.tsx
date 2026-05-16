'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  const fetchAllProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
    } catch {
      addToast('Lỗi khi lấy dữ liệu sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllProducts(); }, []);

  const toggleStock = async (id: string, currentStatus: boolean) => {
    addToast('Tính năng đang cập nhật! 🛠️');
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Sản Phẩm Toàn Sàn</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Tổng cộng {products.length} sản phẩm đang được bày bán từ mọi người bán.</p>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>SẢN PHẨM / NGƯỜI BÁN</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>GIÁ BÁN</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>KHO HÀNG</th>
              <th style={{ padding: '20px', textAlign: 'left', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>ĐÁNH GIÁ</th>
              <th style={{ padding: '20px', textAlign: 'right', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu sản phẩm...</td></tr>
            ) : products.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ fontSize: '30px' }}>{p.emoji}</span>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700 }}>{p.name}</p>
                      <span style={{ fontSize: '11px', color: 'var(--accent)' }}>Shop ID: {p.sellerId?.slice(0,8)}...</span>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '20px', fontWeight: 700 }}>{formatPrice(p.price)}</td>
                <td style={{ padding: '20px' }}>
                  <span style={{ 
                    padding: '4px 10px', borderRadius: '20px', fontSize: '11px',
                    background: p.inStock ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: p.inStock ? '#10b981' : '#ef4444'
                  }}>
                    {p.inStock ? 'Hợp lệ' : 'Tạm khóa'}
                  </span>
                </td>
                <td style={{ padding: '20px', fontSize: '13px' }}>⭐ {p.rating} ({p.reviews})</td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button onClick={() => toggleStock(p.id, p.inStock)} style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Kiểm duyệt</button>
                    <button style={{ padding: '8px 12px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Gỡ bỏ</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
