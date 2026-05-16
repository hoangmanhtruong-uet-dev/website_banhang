'use client';
import { useState, useEffect } from 'react';
import { useToastStore } from '@/components/ui/Toast';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const updateStock = async (id: string, newStock: number) => {
    addToast('Đang cập nhật kho hàng... 📦');
    // Logic cập nhật API sẽ được viết ở bước sau
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Kho Hàng</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Theo dõi số lượng tồn kho và cập nhật hàng hóa trong hệ thống.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #ef4444' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Sản phẩm sắp hết hàng</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>05</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #f59e0b' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Sản phẩm hết hàng</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>02</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #10b981' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Tổng số mã hàng (SKU)</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>{products.length}</h2>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ padding: '20px', textAlign: 'left' }}>SẢN PHẨM</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>SKU</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>SỐ LƯỢNG TỒN</th>
              <th style={{ padding: '20px', textAlign: 'left' }}>TRẠNG THÁI</th>
              <th style={{ padding: '20px', textAlign: 'right' }}>NHẬP HÀNG</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu kho...</td></tr>
            ) : products.map((p: any) => (
              <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>{p.emoji}</span>
                    <span style={{ fontWeight: 700 }}>{p.name}</span>
                  </div>
                </td>
                <td style={{ padding: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>#{p.id.slice(-8).toUpperCase()}</td>
                <td style={{ padding: '20px' }}>
                  <strong style={{ fontSize: '16px', color: p.stockQuantity < 10 ? '#ef4444' : 'white' }}>
                    {p.stockQuantity || 100}
                  </strong>
                </td>
                <td style={{ padding: '20px' }}>
                  {(p.stockQuantity || 100) < 10 ? (
                    <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>⚠️ CẦN NHẬP HÀNG</span>
                  ) : (
                    <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 700 }}>✅ AN TOÀN</span>
                  )}
                </td>
                <td style={{ padding: '20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <input type="number" defaultValue={0} style={{ width: '60px', padding: '5px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                    <button onClick={() => updateStock(p.id, 10)} className="btn-secondary" style={{ padding: '5px 15px', fontSize: '12px' }}>Cập nhật</button>
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
