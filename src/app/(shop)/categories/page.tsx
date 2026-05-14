'use client';
import Link from 'next/link';
import { mockProducts, categories } from '@/lib/mockData';

const categoryIcons: Record<string, string> = {
  'Thời trang': '👗',
  'Công nghệ': '💻',
  'Làm đẹp': '💄',
  'Gia dụng': '🏠',
};

const categoryColors: Record<string, string> = {
  'Thời trang': 'rgba(236, 72, 153, 0.15)',
  'Công nghệ': 'rgba(59, 130, 246, 0.15)',
  'Làm đẹp': 'rgba(168, 85, 247, 0.15)',
  'Gia dụng': 'rgba(34, 197, 94, 0.15)',
};

const categoryBorders: Record<string, string> = {
  'Thời trang': 'rgba(236, 72, 153, 0.3)',
  'Công nghệ': 'rgba(59, 130, 246, 0.3)',
  'Làm đẹp': 'rgba(168, 85, 247, 0.3)',
  'Gia dụng': 'rgba(34, 197, 94, 0.3)',
};

export default function CategoriesPage() {
  const displayCategories = categories.filter(c => c !== 'Tất cả');

  return (
    <div className="page-container" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div className="section-intro" style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, marginBottom: '16px', lineHeight: 1.1 }}>
          Khám phá tất cả <span className="text-gradient">danh mục</span> của chúng tôi
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto', lineHeight: 1.8 }}>
          Từ thời trang hiện đại đến công nghệ tiên tiến, tất cả những gì bạn cần đều có ở đây
        </p>
      </div>

      <div className="categories-showcase" style={{
        display: 'grid',
        gap: '28px',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        maxWidth: '1280px',
        margin: '0 auto',
      }}>
        {displayCategories.map((cat, i) => {
          const count = mockProducts.filter(p => p.category === cat).length;
          const slug = cat.toLowerCase().replace(/\s+/g, '-');

          return (
            <Link
              key={cat}
              href={`/categories/${slug}`}
              className="category-showcase-card"
              style={{
                animation: `fadeInUp 0.6s ease-out ${i * 0.1}s forwards`,
                opacity: 0,
              }}
            >
              <div style={{
                background: categoryColors[cat] || 'rgba(255,255,255,0.05)',
                border: `1.5px solid ${categoryBorders[cat] || 'rgba(255,255,255,0.1)'}`,
                borderRadius: '24px',
                padding: '48px 32px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                height: '100%',
                justifyContent: 'space-between',
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{ marginBottom: '24px' }}>
                  <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>
                    {categoryIcons[cat] || '📦'}
                  </span>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px' }}>
                    {cat}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {count} sản phẩm
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--accent)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}>
                  Xem chi tiết <span>→</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <style jsx>{`
        .category-showcase-card {
          text-decoration: none;
          display: block;
        }

        .category-showcase-card:hover > div {
          transform: translateY(-12px);
          box-shadow: 0 32px 64px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
}
