'use client';
import { useState, useEffect, useCallback } from 'react';
import { useToastStore } from '@/components/ui/Toast';

type InventoryProduct = {
  id: string;
  code: string;
  name: string;
  emoji?: string | null;
  stockQuantity: number;
  inStock: boolean;
};

type InventoryStats = {
  totalSku: number;
  lowStock: number;
  outOfStock: number;
};

function calcStats(products: InventoryProduct[]): InventoryStats {
  return {
    totalSku: products.length,
    lowStock: products.filter(p => p.stockQuantity > 0 && p.stockQuantity < 10).length,
    outOfStock: products.filter(p => p.stockQuantity <= 0).length,
  };
}

export default function InventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats>({ totalSku: 0, lowStock: 0, outOfStock: 0 });
  const [loading, setLoading] = useState(true);
  const [restockInputs, setRestockInputs] = useState<Record<string, number>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const addToast = useToastStore(s => s.addToast);

  const fetchInventory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/admin/inventory?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      });
      const data = await res.json();
      if (res.ok && data.products) {
        const list = data.products.map((p: InventoryProduct) => ({
          ...p,
          stockQuantity: Number(p.stockQuantity),
        }));
        setProducts(list);
        setStats(data.stats ?? calcStats(list));
      } else if (!silent) {
        addToast(data.error || 'Không tải được dữ liệu kho.');
      }
    } catch {
      if (!silent) addToast('Lỗi kết nối server.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  const updateStock = async (id: string) => {
    const addQuantity = restockInputs[id] ?? 0;
    if (addQuantity <= 0) {
      addToast('Nhập số lượng cần nhập hàng (> 0).');
      return;
    }

    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addQuantity }),
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.product) {
        const updated: InventoryProduct = {
          ...data.product,
          stockQuantity: Number(data.product.stockQuantity),
        };
        setProducts(prev => {
          const next = prev.map(p => (p.id === id ? { ...p, ...updated } : p));
          setStats(calcStats(next));
          return next;
        });
        addToast(data.message || 'Cập nhật kho thành công! 📦');
        setRestockInputs(prev => ({ ...prev, [id]: 0 }));
        await fetchInventory(true);
      } else {
        addToast(data.error || 'Cập nhật thất bại.');
      }
    } catch {
      addToast('Lỗi kết nối.');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStockStatus = (qty: number) => {
    if (qty <= 0) return { label: '❌ HẾT HÀNG', color: '#ef4444' };
    if (qty < 10) return { label: '⚠️ CẦN NHẬP HÀNG', color: '#f59e0b' };
    return { label: '✅ AN TOÀN', color: '#10b981' };
  };

  return (
    <div>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 900 }}>Quản Lý Kho Hàng</h1>
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>
          Tồn kho lưu trong database (cột <code style={{ color: 'var(--accent)' }}>stockQuantity</code>). Nhập hàng = cộng thêm vào tồn hiện tại.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '30px' }}>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #ef4444' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Sản phẩm sắp hết hàng (&lt; 10)</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>{String(stats.lowStock).padStart(2, '0')}</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #f59e0b' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Sản phẩm hết hàng</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>{String(stats.outOfStock).padStart(2, '0')}</h2>
        </div>
        <div className="glass-card" style={{ padding: '24px', borderLeft: '5px solid #10b981' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 5px' }}>Tổng số mã hàng (SKU)</p>
          <h2 style={{ fontSize: '28px', margin: 0 }}>{stats.totalSku}</h2>
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
              <th style={{ padding: '20px', textAlign: 'right' }}>NHẬP HÀNG (+cộng thêm)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '50px', textAlign: 'center' }}>Đang tải dữ liệu kho...</td></tr>
            ) : products.map((p) => {
              const status = getStockStatus(p.stockQuantity);
              return (
                <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{p.emoji || '📦'}</span>
                      <span style={{ fontWeight: 700 }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{p.code}</td>
                  <td style={{ padding: '20px' }}>
                    <strong
                      key={`${p.id}-${p.stockQuantity}`}
                      style={{ fontSize: '16px', color: p.stockQuantity < 10 ? '#ef4444' : 'white' }}
                    >
                      {p.stockQuantity}
                    </strong>
                  </td>
                  <td style={{ padding: '20px' }}>
                    <span style={{ color: status.color, fontSize: '11px', fontWeight: 700 }}>{status.label}</span>
                  </td>
                  <td style={{ padding: '20px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <input
                        type="number"
                        min={1}
                        value={restockInputs[p.id] ?? ''}
                        placeholder="0"
                        onChange={e => setRestockInputs(prev => ({
                          ...prev,
                          [p.id]: parseInt(e.target.value, 10) || 0,
                        }))}
                        style={{ width: '72px', padding: '6px 8px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      />
                      <button
                        type="button"
                        disabled={updatingId === p.id}
                        onClick={() => updateStock(p.id)}
                        className="btn-secondary"
                        style={{ padding: '6px 15px', fontSize: '12px', opacity: updatingId === p.id ? 0.6 : 1 }}
                      >
                        {updatingId === p.id ? '...' : 'Cập nhật'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
