'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';

export default function NewProductPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    originalPrice: '',
    description: '',
    categoryId: '',
    emoji: '📦',
    badge: '',
    inStock: true,
  });

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/seller/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: Number(formData.price),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
        }),
      });

      if (res.ok) {
        addToast('Đăng sản phẩm thành công! 🛍️');
        router.push('/seller');
      } else {
        const error = await res.json();
        addToast(error.error || 'Lỗi khi đăng sản phẩm');
      }
    } catch {
      addToast('Lỗi server.');
    }
    setLoading(false);
  };

  return (
    <div className="page-container" style={{ paddingTop: '40px', paddingBottom: '80px', maxWidth: '800px' }}>
      <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginBottom: '20px' }}>← Trở lại</button>
      
      <div className="glass-card" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '30px' }}>Đăng sản phẩm mới</h1>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Tên sản phẩm</label>
              <input required className="input-field" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ví dụ: Áo thun cao cấp" />
            </div>
            <div style={{ width: '100px' }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Emoji</label>
              <input required className="input-field" style={{ textAlign: 'center', fontSize: '24px' }} value={formData.emoji} onChange={e => setFormData({...formData, emoji: e.target.value})} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Giá bán (VNĐ)</label>
              <input type="number" required className="input-field" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Ví dụ: 500000" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Giá gốc (nếu có)</label>
              <input type="number" className="input-field" value={formData.originalPrice} onChange={e => setFormData({...formData, originalPrice: e.target.value})} placeholder="Ví dụ: 700000" />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Danh mục</label>
            <select required className="input-field" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} style={{ width: '100%' }}>
              <option value="">Chọn danh mục</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Mô tả sản phẩm</label>
            <textarea required className="input-field" style={{ minHeight: '150px', width: '100%' }} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Nhập mô tả chi tiết sản phẩm của bạn..." />
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Nhãn (Badge)</label>
              <input className="input-field" value={formData.badge} onChange={e => setFormData({...formData, badge: e.target.value})} placeholder="Ví dụ: Hot, Mới, -20%" />
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '30px' }}>
              <input type="checkbox" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} />
              <label style={{ fontSize: '14px' }}>Sản phẩm còn hàng</label>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '20px', padding: '15px' }}>
            {loading ? 'Đang xử lý...' : 'Đăng bán sản phẩm'}
          </button>
        </form>
      </div>
    </div>
  );
}
