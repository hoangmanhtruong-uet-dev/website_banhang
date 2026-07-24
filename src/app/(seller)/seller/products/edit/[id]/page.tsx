'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useToastStore } from '@/components/ui/Toast';

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();
  const addToast = useToastStore(s => s.addToast);
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
    // Tải danh sách danh mục
    fetch('/api/categories')
      .then(r => r.json())
      .then(setCategories)
      .catch(err => console.error('Lỗi tải danh mục', err));

    // Tải chi tiết sản phẩm cần sửa
    if (id) {
      fetch(`/api/products/${id}`)
        .then(res => {
          if (!res.ok) {
            if (res.status === 404) setNotFound(true);
            throw new Error('Không tìm thấy sản phẩm');
          }
          return res.json();
        })
        .then(data => {
          setFormData({
            name: data.name || '',
            price: data.price !== undefined ? String(data.price) : '',
            originalPrice: data.originalPrice ? String(data.originalPrice) : '',
            description: data.description || '',
            categoryId: data.categoryId || '',
            emoji: data.emoji || '📦',
            badge: data.badge || '',
            inStock: data.inStock ?? true,
          });
          if (data.images && Array.isArray(data.images)) {
            setImages(data.images.map((img: any) => img.url));
          }
        })
        .catch(err => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id]);

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
    setSaving(true);
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          price: formData.price,
          originalPrice: formData.originalPrice || null,
          images: images,
        }),
      });

      if (res.ok) {
        addToast('Cập nhật sản phẩm thành công! 🛍️');
        router.push('/seller/products');
        router.refresh();
      } else {
        const error = await res.json();
        addToast(error.error || 'Lỗi khi cập nhật sản phẩm');
      }
    } catch {
      addToast('Lỗi kết nối server.');
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="page-container" style={{ paddingTop: '40px', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Đang tải thông tin sản phẩm...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="page-container" style={{ paddingTop: '80px', textAlign: 'center' }}>
        <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>😞</span>
        <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '20px' }}>Sản phẩm không tồn tại</h2>
        <button onClick={() => router.push('/seller/products')} className="btn-primary" style={{ padding: '10px 20px' }}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ paddingTop: '40px', paddingBottom: '80px', maxWidth: '800px' }}>
      <button 
        onClick={() => router.back()} 
        style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', marginBottom: '20px', fontSize: '14px', fontWeight: 600 }}
      >
        ← Trở lại
      </button>
      
      <div className="glass-card" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '30px' }}>Chỉnh sửa sản phẩm</h1>
        
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
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: 'var(--text-muted)' }}>Ảnh sản phẩm (Tải lên ảnh thật để thay thế emoji mặc định)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
              {images.map((url, index) => (
                <div key={index} style={{ width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
              <input type="checkbox" id="inStockCheckbox" checked={formData.inStock} onChange={e => setFormData({...formData, inStock: e.target.checked})} />
              <label htmlFor="inStockCheckbox" style={{ fontSize: '14px', cursor: 'pointer' }}>Sản phẩm còn hàng</label>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '20px', padding: '15px' }}>
            {saving ? 'Đang cập nhật...' : 'Cập nhật sản phẩm'}
          </button>
        </form>
      </div>
    </div>
  );
}
