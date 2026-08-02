'use client';
import Link from 'next/link';
import { Product } from '@/types/product';
import { getAvailableStock, useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';
import { compareMoneyStrings, percentageOff } from '@/lib/utils/client-money';
import { useState } from 'react';
import { getProductImage } from '@/lib/product-image';
import { useAuthStore } from '@/store/authStore';
import { usePathname, useRouter } from 'next/navigation';

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
  const { isAuthenticated, isLoading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [added, setAdded] = useState(false);
  const image = getProductImage(product);
  const category = product.category || product.categoryRef?.name || 'S\u1ea3n ph\u1ea9m';
  const availableStock = getAvailableStock(product);
  const hasDiscount = Boolean(product.originalPrice && compareMoneyStrings(product.originalPrice, product.price) > 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <Link href={`/products/${product.id}`} className="glass-card product-card"
      style={{ display:'block', overflow:'hidden', height:'100%' }}>
      <div style={{ animation:`fadeInUp 0.6s ease-out ${index * 0.08}s forwards`, opacity:0, display:'flex', flexDirection:'column', height:'100%' }}>
        <div className="product-image" style={{ background: product.gradient, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          {product.badge && (
            <span className={`badge ${getBadgeClass(product.badge)}`}
              style={{ position:'absolute', top:'12px', left:'12px', zIndex:2 }}>
              {product.badge}
            </span>
          )}
          {hasDiscount && product.originalPrice && (
            <span style={{ position:'absolute', top:'12px', right:'12px', zIndex:2,
              background:'rgba(239,68,68,0.9)', color:'#fff',
              fontSize:'11px', fontWeight:700, padding:'4px 8px', borderRadius:'6px' }}>
              -{percentageOff(product.price, product.originalPrice)}%
            </span>
          )}
        </div>
        <div style={{ padding:'16px', display:'flex', flexDirection:'column', flex:'1 1 auto' }}>
          <p style={{ fontSize:'12px', color:'var(--accent)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>
            {category}
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
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1fr) 42px', alignItems:'center', gap:'12px', marginTop:'auto' }}>
            <div style={{ minWidth:0, overflow:'hidden' }}>
              <span style={{ display:'block', fontSize:'17px', fontWeight:700, color:'var(--accent)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{formatPrice(product.price)}</span>
              {hasDiscount && product.originalPrice && (
                <span style={{ display:'block', fontSize:'12px', color:'var(--text-muted)', textDecoration:'line-through', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>
            <button onClick={handleAdd} disabled={isLoading || availableStock <= 0} aria-label={isAuthenticated ? 'Add to cart' : 'Login to add to cart'} style={{
              width:'42px', minWidth:'42px', height:'42px', borderRadius:'50%',
              background: added ? 'var(--success)' : 'var(--accent-gradient)',
              border:'none', cursor: availableStock > 0 ? 'pointer' : 'not-allowed', display:'flex',
              alignItems:'center', justifyContent:'center',
              transition:'all 0.3s ease', fontSize:'16px',
              transform: added ? 'scale(1.1)' : 'scale(1)',
            }}>
              {availableStock <= 0 ? '×' : added ? '✓' : '+'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
