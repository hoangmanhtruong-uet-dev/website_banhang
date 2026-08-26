'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';
import SafeImage from '@/components/common/SafeImage';
import { DEFAULT_PRODUCT_IMAGE } from '@/lib/product-image';

export default function NewProductPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    stockQuantity: '0',
    lowStockThreshold: '5',
    price: '',
    originalPrice: '',
    description: '',
    categoryId: '',
    emoji: '📦',
    badge: '',
    inStock: true,
  });

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch('/api/categories').then(r => r.json()).then(setCategories);
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploading(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const data = new FormData();
        data.append('file', file);
        data.append('purpose', 'product');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: data,
        });
        
        if (res.ok) {
          const result = await res.json();
          urls.push(result.url);
        }
      }
      setImages(prev => [...prev, ...urls]);
      addToast('Tải ảnh lên thành công! 📸');
    } catch (err) {
      console.error(err);
      addToast('Lỗi khi tải ảnh lên.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/seller/products/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price,
          originalPrice: formData.originalPrice || null,
          images: images,
          sku: formData.sku || undefined,
          stockQuantity: Number(formData.stockQuantity),
          lowStockThreshold: Number(formData.lowStockThreshold),
        }),
      });

      if (res.ok) {
        addToast('Đăng sản phẩm thành công! 🛍️');
        router.push('/seller/products');
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

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
            <div><label className="input-label">SKU</label><input className="input-field" value={formData.sku} onChange={e=>setFormData({...formData,sku:e.target.value})} placeholder="Để trống để tự tạo" /></div>
            <div><label className="input-label">Tồn kho</label><input required type="number" min="0" className="input-field" value={formData.stockQuantity} onChange={e=>setFormData({...formData,stockQuantity:e.target.value})} /></div>
            <div><label className="input-label">Cảnh báo thấp</label><input required type="number" min="0" className="input-field" value={formData.lowStockThreshold} onChange={e=>setFormData({...formData,lowStockThreshold:e.target.value})} /></div>
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
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Ảnh sản phẩm (Tải lên ảnh thật để thay thế emoji mặc định)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
              {images.map((url, index) => (
                <div key={index} style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <SafeImage src={url} fallbackSrc={DEFAULT_PRODUCT_IMAGE} alt={'Product preview ' + (index + 1)} fill sizes="100px" style={{ objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setImages(images.filter((_, i) => i !== index))}
                    style={{
                      position: 'absolute', top: '5px', right: '5px', width: '22px', height: '22px', borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              <label style={{
                width: '100px', height: '100px', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.2)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                cursor: uploading ? 'not-allowed' : 'pointer', background: 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s', opacity: uploading ? 0.6 : 1
              }}>
                <span style={{ fontSize: '24px' }}>📷</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {uploading ? 'Đang tải...' : 'Thêm ảnh'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  disabled={uploading}
                  onChange={handleImageUpload}
                  style={{ display: 'none' }}
                />
              </label>
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
