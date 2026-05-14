'use client';
import { useState, useEffect, useCallback } from 'react';
import { categories } from '@/lib/mockData';
import ProductCard from '@/components/product/ProductCard';
import { useSearchParams } from 'next/navigation';
import { Product } from '@/types/product';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get('category') || 'Tất cả';
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'Tất cả') params.set('category', selectedCategory);
      if (searchQuery) params.set('search', searchQuery);
      if (sortBy !== 'default') {
        if (sortBy === 'price-asc') { params.set('sortBy', 'price'); params.set('order', 'asc'); }
        else if (sortBy === 'price-desc') { params.set('sortBy', 'price'); params.set('order', 'desc'); }
        else if (sortBy === 'rating') { params.set('sortBy', 'rating'); params.set('order', 'desc'); }
        else if (sortBy === 'name') { params.set('sortBy', 'name'); params.set('order', 'asc'); }
      }
      const res = await fetch(`/api/products?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Lỗi khi tải sản phẩm:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, sortBy, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchProducts, searchQuery ? 400 : 0);
    return () => clearTimeout(timer);
  }, [fetchProducts, searchQuery]);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '40px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          Sản phẩm <span style={{ color: 'var(--accent)' }}>của chúng tôi</span>
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
          {loading ? 'Đang tải...' : `Khám phá ${products.length} sản phẩm chất lượng cao`}
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '32px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 Tìm kiếm sản phẩm..." className="input-field"
          style={{ maxWidth: '300px' }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        <select className="input-field" style={{ maxWidth: '200px' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="default">Sắp xếp mặc định</option>
          <option value="price-asc">Giá: Thấp → Cao</option>
          <option value="price-desc">Giá: Cao → Thấp</option>
          <option value="rating">Đánh giá cao nhất</option>
          <option value="name">Tên A-Z</option>
        </select>
      </div>

      {/* Category Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', flexWrap: 'wrap' }}>
        {categories.map(cat => (
          <button key={cat} onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '8px 20px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: '1px solid', transition: 'all 0.3s ease',
              ...(selectedCategory === cat
                ? { background: 'var(--accent-gradient)', color: '#000', borderColor: 'transparent' }
                : { background: 'transparent', color: 'var(--text-secondary)', borderColor: 'var(--border)' }),
            }}>
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="product-grid">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="glass-card" style={{ height: '340px', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="product-grid">
          {products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px 0' }}>
          <span style={{ fontSize: '48px', display: 'block', marginBottom: '16px' }}>🔍</span>
          <p style={{ fontSize: '18px', color: 'var(--text-muted)' }}>Không tìm thấy sản phẩm nào</p>
        </div>
      )}
    </div>
  );
}