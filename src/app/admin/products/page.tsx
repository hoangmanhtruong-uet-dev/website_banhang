'use client';
import { useState, useEffect } from 'react';
import { formatPrice } from '@/lib/utils';
import { useToastStore } from '@/components/ui/Toast';

const categories = ['Thời trang', 'Công nghệ', 'Làm đẹp', 'Gia dụng'];
const gradients = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
];

const emptyForm = { name: '', price: '', originalPrice: '', description: '', category: 'Thời trang', emoji: '📦', badge: '', inStock: true };

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  description?: string;
  category: string;
  emoji?: string;
  badge?: string;
  gradient?: string;
  inStock: boolean;
  rating?: number;
  reviews?: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const addToast = useToastStore(s => s.addToast);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []);

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setEditProduct(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ name: p.name, price: p.price.toString(), originalPrice: p.originalPrice?.toString() ?? '',
      description: p.description ?? '', category: p.category ?? 'Thời trang',
      emoji: p.emoji ?? '📦', badge: p.badge ?? '', inStock: p.inStock });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price || !form.description) { addToast('Vui lòng điền đầy đủ thông tin'); return; }
    setSaving(true);
    try {
      const body = {
        name: form.name, price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        description: form.description, category: form.category,
        emoji: form.emoji || '📦',
        gradient: gradients[categories.indexOf(form.category)] ?? gradients[0],
        badge: form.badge || null, inStock: form.inStock,
        rating: editProduct?.rating ?? 4.5, reviews: editProduct?.reviews ?? 0,
      };
      const url = editProduct ? `/api/products/${editProduct.id}` : '/api/products';
      const method = editProduct ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        await fetchProducts();
        setShowModal(false);
        addToast(editProduct ? 'Cập nhật sản phẩm thành công! ✅' : 'Thêm sản phẩm thành công! ✅');
      } else {
        const errorData = await res.json();
        addToast(errorData.error || 'Lỗi khi lưu sản phẩm');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Xóa sản phẩm này?')) return;
    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
    if (res.ok) { setProducts(prev => prev.filter(p => p.id !== id)); addToast('Đã xóa sản phẩm'); }
    else addToast('Xóa thất bại');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 800 }}>Sản phẩm</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{loading ? 'Đang tải...' : `${products.length} sản phẩm`}</p>
        </div>
        <button className="btn-primary" onClick={openAdd}>+ Thêm sản phẩm</button>
      </div>

      <input className="input-field" placeholder="🔍 Tìm sản phẩm..." value={search}
        onChange={e => setSearch(e.target.value)} style={{ maxWidth: '300px', marginBottom: '24px' }} />

      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <table className="data-table">
          <thead><tr><th></th><th>Tên sản phẩm</th><th>Danh mục</th><th>Giá</th><th>Badge</th><th>Tồn kho</th><th>Đánh giá</th><th>Thao tác</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>Đang tải...</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td><div style={{ width: '40px', height: '40px', borderRadius: '8px', background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{p.emoji}</div></td>
                <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</td>
                <td>{p.category}</td>
                <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                  {formatPrice(p.price)}
                  {p.originalPrice && <span style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through', marginLeft: '6px' }}>{formatPrice(p.originalPrice)}</span>}
                </td>
                <td>{p.badge ? <span className="badge badge-new">{p.badge}</span> : '—'}</td>
                <td><span style={{ color: p.inStock ? 'var(--success)' : 'var(--danger)', fontWeight: 600, fontSize: '13px' }}>{p.inStock ? '✅ Còn' : '❌ Hết'}</span></td>
                <td>⭐ {p.rating} ({p.reviews})</td>
                <td>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary btn-sm" onClick={() => openEdit(p)}>✏️ Sửa</button>
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '560px', width: '100%' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px' }}>
              {editProduct ? '✏️ Sửa sản phẩm' : '➕ Thêm sản phẩm'}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div><label className="input-label">Tên sản phẩm *</label><input className="input-field" value={form.name} onChange={e => set('name', e.target.value)} placeholder="Nhập tên sản phẩm" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><label className="input-label">Giá (VND) *</label><input className="input-field" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="1000000" /></div>
                <div><label className="input-label">Giá gốc (để trống nếu không giảm)</label><input className="input-field" type="number" value={form.originalPrice} onChange={e => set('originalPrice', e.target.value)} placeholder="0" /></div>
              </div>
              <div><label className="input-label">Mô tả *</label><textarea className="input-field" rows={3} value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} placeholder="Mô tả chi tiết sản phẩm..." /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div><label className="input-label">Danh mục</label>
                  <select className="input-field" value={form.category} onChange={e => set('category', e.target.value)}>
                    {categories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="input-label">Emoji</label><input className="input-field" value={form.emoji} onChange={e => set('emoji', e.target.value)} /></div>
                <div><label className="input-label">Badge</label><input className="input-field" value={form.badge} onChange={e => set('badge', e.target.value)} placeholder="Hot, Sale, Mới..." /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input type="checkbox" id="inStock" checked={form.inStock} onChange={e => set('inStock', e.target.checked)} style={{ width: '16px', height: '16px' }} />
                <label htmlFor="inStock" style={{ fontSize: '14px', cursor: 'pointer' }}>Còn hàng</label>
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button className="btn-secondary" onClick={() => setShowModal(false)}>Hủy</button>
                <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
