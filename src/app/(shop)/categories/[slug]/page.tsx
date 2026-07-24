'use client';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { mockProducts } from '@/lib/mockData';
import ProductCard from '@/components/product/ProductCard';
import { use } from 'react';
import { compareMoneyStrings } from '@/lib/utils/client-money';

interface PageProps {
  params: Promise<{ slug: string }>;
}

const categoryIcons: Record<string, string> = {
  'thời trang': '👗',
  'công nghệ': '💻',
  'làm đẹp': '💄',
  'gia dụng': '🏠',
};

export default function CategoryDetailPage(props: PageProps) {
  const params = use(props.params);
  const slug = params.slug;
  const categoryName = slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const [sortBy, setSortBy] = useState('default');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 30000000]);
  const [selectedRating, setSelectedRating] = useState(0);
  const [viewType, setViewType] = useState<'grid' | 'list'>('grid');

  const categoryProducts = mockProducts.filter(p => p.category === categoryName);

  const filtered = useMemo(() => {
    let list = [...categoryProducts];

    // Filter by price
    list = list.filter(p => compareMoneyStrings(p.price, priceRange[0]) >= 0 && compareMoneyStrings(p.price, priceRange[1]) <= 0);

    // Filter by rating
    if (selectedRating > 0) {
      list = list.filter(p => Math.round(p.rating) >= selectedRating);
    }

    // Sort
    if (sortBy === 'price-asc') list.sort((a, b) => compareMoneyStrings(a.price, b.price));
    else if (sortBy === 'price-desc') list.sort((a, b) => compareMoneyStrings(b.price, a.price));
    else if (sortBy === 'rating') list.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'newest') list.sort((a, b) => parseInt(b.id) - parseInt(a.id));

    return list;
  }, [categoryProducts, sortBy, priceRange, selectedRating]);

  return (
    <div className="page-container" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '32px', fontSize: '0.95rem', color: 'var(--text-muted)' }}>
        <Link href="/" style={{ color: 'var(--accent)' }}>Trang chủ</Link>
        <span>/</span>
        <Link href="/categories" style={{ color: 'var(--accent)' }}>Danh mục</Link>
        <span>/</span>
        <span>{categoryName}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '48px', animation: 'fadeInUp 0.6s ease-out' }}>
        <span style={{ fontSize: '56px', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
          {categoryIcons[slug] || '📦'}
        </span>
        <div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '8px' }}>{categoryName}</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
            {filtered.length} sản phẩm
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '32px', gridTemplateColumns: '280px 1fr' }}>
        {/* Sidebar Filters */}
        <div className="category-filters" style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '28px',
          height: 'fit-content',
          position: 'sticky',
          top: '100px',
        }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '20px' }}>Bộ lọc</h3>

          {/* Price Range */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>Khoảng giá</p>
            <input
              type="range"
              min="0"
              max="30000000"
              step="1000000"
              value={priceRange[1]}
              onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
              style={{
                width: '100%',
                cursor: 'pointer',
                accentColor: 'var(--accent)',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              <span>0 VNĐ</span>
              <span>{(priceRange[1] / 1000000).toFixed(0)}M VNĐ</span>
            </div>
          </div>

          {/* Rating Filter */}
          <div style={{ marginBottom: '28px' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>Đánh giá</p>
            {[5, 4, 3, 2, 1].map(rating => (
              <button
                key={rating}
                onClick={() => setSelectedRating(selectedRating === rating ? 0 : rating)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 12px',
                  background: selectedRating === rating ? 'rgba(245,158,11,0.15)' : 'transparent',
                  border: selectedRating === rating ? '1px solid var(--accent)' : '1px solid transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.2s ease',
                  marginBottom: '6px',
                  color: selectedRating === rating ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {Array(rating).fill('⭐').join('')} {rating} sao
              </button>
            ))}
          </div>

          {/* Reset Button */}
          <button
            onClick={() => {
              setSortBy('default');
              setPriceRange([0, 30000000]);
              setSelectedRating(0);
            }}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '8px',
              color: 'var(--accent)',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(245,158,11,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = 'rgba(245,158,11,0.1)';
            }}
          >
            Xóa bộ lọc
          </button>
        </div>

        {/* Main Content */}
        <div>
          {/* Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '16px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
          }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="input-field"
              style={{ maxWidth: '220px', fontSize: '0.95rem' }}
            >
              <option value="default">Sắp xếp mặc định</option>
              <option value="price-asc">Giá: Thấp → Cao</option>
              <option value="price-desc">Giá: Cao → Thấp</option>
              <option value="rating">Đánh giá cao nhất</option>
              <option value="newest">Mới nhất</option>
            </select>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setViewType('grid')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: viewType === 'grid' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: viewType === 'grid' ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ⊞
              </button>
              <button
                onClick={() => setViewType('list')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  background: viewType === 'list' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.05)',
                  border: viewType === 'list' ? '1px solid var(--accent)' : '1px solid transparent',
                  cursor: 'pointer',
                  fontSize: '18px',
                }}
              >
                ☰
              </button>
            </div>
          </div>

          {/* Products */}
          {filtered.length > 0 ? (
            <div
              style={{
                display: viewType === 'grid' ? 'grid' : 'flex',
                flexDirection: viewType === 'list' ? 'column' : undefined,
                gap: '24px',
                gridTemplateColumns: viewType === 'grid' ? 'repeat(auto-fill, minmax(260px, 1fr))' : undefined,
              }}
            >
              {filtered.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 32px' }}>
              <span style={{ fontSize: '56px', display: 'block', marginBottom: '16px' }}>🔍</span>
              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)' }}>Không tìm thấy sản phẩm phù hợp</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
