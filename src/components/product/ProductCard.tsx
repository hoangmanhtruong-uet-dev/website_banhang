'use client';
import Link from 'next/link';
import { Product } from '@/types/product';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { useState } from 'react';

function getBadgeClass(badge?: string) {
  if (!badge) return '';
  const b = badge.toLowerCase();
  if (b === 'hot') return 'badge-hot';
  if (b === 'sale') return 'badge-sale';
  if (b === 'mới' || b === 'new') return 'badge-new';
  if (b === 'bán chạy') return 'badge-bestseller';
  if (b === 'premium') return 'badge-premium';
  return 'badge-new';
}

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const addItem = useCartStore(s => s.addItem);
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link href={`/products/${product.id}`} className="glass-card"
      style={{ display:'block', overflow:'hidden' }}>
      <div style={{ animation:`fadeInUp 0.6s ease-out ${index * 0.08}s forwards`, opacity:0 }}>
        <div className="product-image" style={{ background: product.gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.image ? (
            <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize:'64px', zIndex:1, filter:'drop-shadow(0 4px 8px rgba(0,0,0,0.3))' }}>
              {product.emoji}
            </span>
          )}
          {product.badge && (
            <span className={`badge ${getBadgeClass(product.badge)}`}
              style={{ position:'absolute', top:'12px', left:'12px', zIndex:2 }}>
              {product.badge}
            </span>
          )}
          {product.originalPrice && (
            <span style={{ position:'absolute', top:'12px', right:'12px', zIndex:2,
              background:'rgba(239,68,68,0.9)', color:'#fff',
              fontSize:'11px', fontWeight:700, padding:'4px 8px', borderRadius:'6px' }}>
              -{Math.round((1 - product.price / product.originalPrice) * 100)}%
            </span>
          )}
        </div>
        <div style={{ padding:'16px' }}>
          <p style={{ fontSize:'12px', color:'var(--accent)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>
            {product.category}
          </p>
          <h3 style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px', lineHeight:'1.4',
            overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {product.name}
          </h3>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'10px' }}>
            <div className="stars">
              {[1,2,3,4,5].map(s => (
                <span key={s} className={`star ${s <= Math.round(product.rating) ? 'filled' : ''}`}>★</span>
              ))}
            </div>
            <span style={{ fontSize:'12px', color:'var(--text-muted)' }}>({product.reviews})</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <span style={{ fontSize:'17px', fontWeight:700, color:'var(--accent)' }}>{formatPrice(product.price)}</span>
              {product.originalPrice && (
                <span style={{ fontSize:'13px', color:'var(--text-muted)', textDecoration:'line-through', marginLeft:'8px' }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <button onClick={handleAdd} style={{
              width:'36px', height:'36px', borderRadius:'50%',
              background: added ? 'var(--success)' : 'var(--accent-gradient)',
              border:'none', cursor:'pointer', display:'flex',
              alignItems:'center', justifyContent:'center',
              transition:'all 0.3s ease', fontSize:'16px',
              transform: added ? 'scale(1.1)' : 'scale(1)',
            }}>
              {added ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
