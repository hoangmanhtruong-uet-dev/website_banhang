'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { formatPrice } from '@/lib/utils';
import { Product } from '@/types/product';
import { getProductImage } from '@/lib/product-image';

const categoryIcons: Record<string, string> = {
  'Thời trang': '👗', 'Công nghệ': '💻', 'Làm đẹp': '💄', 'Gia dụng': '🏠',
};
const heroStats = [
  { value: '12K+', label: 'Khách hàng' },
  { value: '500+', label: 'Sản phẩm' },
  { value: '99%', label: 'Hài lòng' },
  { value: '24/7', label: 'Hỗ trợ' },
];
const CATEGORIES = ['Thời trang', 'Công nghệ', 'Làm đẹp', 'Gia dụng'];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products?sortBy=rating&order=desc')
      .then(r => r.json())
      .then(data => { 
        setProducts(Array.isArray(data) ? data : []); 
        setLoading(false); 
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const isProductsArray = Array.isArray(products);
  const featuredProducts = isProductsArray ? products.filter(p => p.badge === 'Hot' || p.badge === 'Bán chạy') : [];
  const saleProducts = isProductsArray ? products.filter(p => p.originalPrice) : [];

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy animate-fadeInUp">
            <span className="hero-pill">✨ Siêu ưu đãi MTRUONG-STORE</span>
            <h1>
              Thưởng thức mua sắm <span className="text-gradient">cao cấp</span> với trải nghiệm
              <br />ấn tượng và đẳng cấp.
            </h1>
            <p>
              MTRUONG-STORE mang đến sản phẩm thời trang, công nghệ, làm đẹp và gia dụng chất lượng cao.
              Giao hàng nhanh, đổi trả linh hoạt và dịch vụ chăm sóc khách hàng tận tâm.
            </p>
            <div className="hero-actions">
              <Link href="/products" className="btn-primary">🛍️ Mua sắm ngay</Link>
              <Link href="/products" className="btn-secondary">Khám phá bộ sưu tập</Link>
            </div>
            <div className="hero-stats">
              {heroStats.map((item) => (
                <div key={item.label} className="hero-stat-card">
                  <p>{item.value}</p>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="hero-showcase animate-fadeInUp">
            {!loading && featuredProducts[0] && (
              <div className="hero-showcase-card">
                <div className="hero-showcase-badge">Best seller</div>
                <div className="hero-showcase-preview">
                  <img className="hero-showcase-image" src={getProductImage(featuredProducts[0])} alt={featuredProducts[0].name} />
                  <div>
                    <p>{featuredProducts[0]?.name}</p>
                    <strong>{formatPrice(featuredProducts[0]?.price ?? 0)}</strong>
                  </div>
                </div>
                <p>{featuredProducts[0]?.category} hàng đầu với đánh giá cao.</p>
              </div>
            )}
            {!loading && featuredProducts[1] && (
              <div className="hero-showcase-card secondary">
                <div className="hero-showcase-meta">
                  <span>Hot pick</span>
                  <strong>{featuredProducts[1]?.badge}</strong>
                </div>
                <div className="hero-showcase-preview">
                  <img className="hero-showcase-image" src={getProductImage(featuredProducts[1])} alt={featuredProducts[1].name} />
                  <div>
                    <p>{featuredProducts[1]?.name}</p>
                    <strong>{formatPrice(featuredProducts[1]?.price ?? 0)}</strong>
                  </div>
                </div>
                <p>Phong cách trẻ trung và công nghệ tiên tiến cho cuộc sống hiện đại.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Danh mục */}
      <section className="section">
        <div className="section-heading">
          <div>Danh mục <span className="text-gradient">nổi bật</span></div>
          <Link href="/products">Xem tất cả →</Link>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((cat, i) => {
            const count = products.filter(p => p.category === cat).length;
            return (
              <Link key={cat} href={`/products?category=${encodeURIComponent(cat)}`}
                className="category-card animate-fadeInUp" style={{ animationDelay: `${i * 0.08}s` }}>
                <span className="category-icon">{categoryIcons[cat]}</span>
                <h3>{cat}</h3>
                <p>{loading ? '...' : `${count} sản phẩm`}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Sản phẩm nổi bật */}
      <section className="section section-alt">
        <div className="section-heading">
          <div>Sản phẩm <span className="text-gradient">nổi bật</span></div>
          <Link href="/products">Xem tất cả →</Link>
        </div>
        <div className="product-grid">
          {loading
            ? [...Array(4)].map((_, i) => <div key={i} className="glass-card" style={{ height: '320px', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />)
            : featuredProducts.slice(0, 4).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
          }
        </div>
      </section>

      {/* Flash Sale Banner */}
      {saleProducts.length > 0 && (
        <section className="banner-sale section">
          <div className="banner-sale-card animate-slideInUp">
            <div>
              <p className="banner-label">Flash Sale</p>
              <h2>Giảm giá cực sốc cho sản phẩm hot</h2>
              <p>Siêu ưu đãi mỗi ngày, săn ngay deal giảm sâu cho {saleProducts.length} mặt hàng.</p>
            </div>
            <Link href="/products" className="btn-primary">Mua ngay</Link>
          </div>
        </section>
      )}

      {/* Bộ sưu tập mới nhất */}
      <section className="section">
        <div className="section-heading">
          <div>Bộ sưu tập <span className="text-gradient">mới nhất</span></div>
          <Link href="/products">Xem tất cả →</Link>
        </div>
        <div className="product-grid">
          {loading
            ? [...Array(8)].map((_, i) => <div key={i} className="glass-card" style={{ height: '320px', animation: 'pulse 1.5s infinite', animationDelay: `${i * 0.1}s` }} />)
            : products.slice(0, 8).map((p, i) => <ProductCard key={p.id} product={p} index={i} />)
          }
        </div>
      </section>
    </>
  );
}
