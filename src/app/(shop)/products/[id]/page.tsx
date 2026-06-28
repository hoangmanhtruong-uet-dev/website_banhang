'use client';
import { useParams } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { useState, useEffect, useTransition } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/components/ui/Toast';
import { Product } from '@/types/product';

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => setProduct(data))
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page-container">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '60px', marginTop: '40px' }}>
          <div className="glass-card" style={{ height: '500px', animation: 'pulse 1.5s infinite' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[200, 100, 300, 160].map((w, i) => (
              <div key={i} style={{ height: '24px', width: `${w}px`, background: 'rgba(255,255,255,0.05)', borderRadius: '8px', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!product) return (
    <div className="page-container" style={{ textAlign: 'center', paddingTop: '120px' }}>
      <span style={{ fontSize: '64px', display: 'block', marginBottom: '16px' }}>😞</span>
      <h2 style={{ fontSize: '24px', fontWeight: 700 }}>Sản phẩm không tồn tại</h2>
    </div>
  );

  const handleAddToCart = () => {
    startTransition(() => {
      addItem(product, qty);
      addToast(`Đã thêm ${qty} ${product.name} vào giỏ hàng! 🛒`);
    });
  };

  return (
    <div className="page-container">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '60px', marginTop: '40px' }}>
        {/* Ảnh / Gallery */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="glass-card" style={{
            height: '500px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: product.gradient || 'var(--bg-secondary)', overflow: 'hidden', position: 'relative'
          }}>
            {product.images && product.images.length > 0 ? (
              <img 
                src={product.images[activeImageIndex]?.url || product.image} 
                alt={product.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : product.image ? (
              <img 
                src={product.image} 
                alt={product.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ fontSize: '120px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' }}>
                {product.emoji}
              </span>
            )}
          </div>
          
          {product.images && product.images.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
              {product.images.map((img: any, i: number) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImageIndex(i)}
                  style={{
                    width: '70px',
                    height: '70px',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: activeImageIndex === i ? '2px solid var(--accent)' : '2px solid transparent',
                    background: 'rgba(255,255,255,0.05)',
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Thông tin */}
        <div>
          <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '14px', textTransform: 'uppercase' }}>{product.category}</span>
          <h1 style={{ fontSize: '40px', fontWeight: 800, margin: '12px 0' }}>{product.name}</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <span style={{ fontSize: '32px', fontWeight: 700, color: 'var(--text-primary)' }}>{formatPrice(product.price)}</span>
            {product.originalPrice && (
              <span style={{ fontSize: '20px', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatPrice(product.originalPrice)}</span>
            )}
            {product.originalPrice && (
              <span style={{ background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px' }}>
                -{Math.round((1 - product.price / product.originalPrice) * 100)}%
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
            {[1,2,3,4,5].map(s => (
              <span key={s} style={{ color: s <= Math.round(product.rating) ? '#fbbf24' : 'rgba(255,255,255,0.2)', fontSize: '20px' }}>★</span>
            ))}
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>({product.reviews} đánh giá)</span>
          </div>

          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', marginBottom: '32px', fontSize: '16px' }}>
            {product.description}
          </p>

          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
              <button onClick={() => setQty(Math.max(1, qty - 1))} style={{ padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}>−</button>
              <span style={{ width: '40px', textAlign: 'center', fontWeight: 600 }}>{qty}</span>
              <button onClick={() => setQty(qty + 1)} style={{ padding: '12px 20px', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '18px' }}>+</button>
            </div>
            <button
              className="btn-primary"
              style={{ flex: 1, justifyContent: 'center', padding: '16px', opacity: isPending ? 0.7 : 1 }}
              onClick={handleAddToCart}
              disabled={isPending || !product.inStock}
            >
              {!product.inStock ? 'Hết hàng' : isPending ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
            </button>
          </div>

          <div style={{ padding: '24px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <span>🚚</span> <span>Giao hàng miễn phí cho đơn hàng trên 2.000.000đ</span>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span>🛡️</span> <span>Bảo hành chính hãng 12 tháng</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}