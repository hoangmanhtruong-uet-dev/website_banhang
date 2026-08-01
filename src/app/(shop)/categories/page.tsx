'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { products: number };
}

const categoryIcons = ['👗', '💻', '💄', '🏠', '📦'];
const categoryColors = [
  'rgba(236, 72, 153, 0.15)',
  'rgba(59, 130, 246, 0.15)',
  'rgba(168, 85, 247, 0.15)',
  'rgba(34, 197, 94, 0.15)',
  'rgba(245, 158, 11, 0.15)',
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/categories')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tải danh mục');
        setCategories(Array.isArray(data) ? data : []);
      })
      .catch(caught => setError(caught instanceof Error ? caught.message : 'Không thể tải danh mục'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page-container" style={{ paddingTop: '80px', paddingBottom: '100px' }}>
      <div className="section-intro" style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, marginBottom: '16px', lineHeight: 1.1 }}>
          Khám phá <span className="text-gradient">danh mục</span>
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-secondary)' }}>
          Chọn danh mục để xem các sản phẩm đang có trong cửa hàng.
        </p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải danh mục...</p>
      ) : error ? (
        <p style={{ textAlign: 'center', color: '#ef4444' }}>{error}</p>
      ) : (
        <div className="categories-showcase" style={{ display: 'grid', gap: '28px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', maxWidth: '1280px', margin: '0 auto' }}>
          {categories.map((category, index) => (
            <Link key={category.id} href={`/categories/${encodeURIComponent(category.slug)}`} className="category-showcase-card">
              <div style={{ background: categoryColors[index % categoryColors.length], border: '1px solid var(--border)', borderRadius: '24px', padding: '48px 32px', textAlign: 'center', height: '100%' }}>
                <span style={{ fontSize: '64px', display: 'block', marginBottom: '20px' }}>{categoryIcons[index % categoryIcons.length]}</span>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px' }}>{category.name}</h2>
                {category.description && <p style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>{category.description}</p>}
                <p style={{ color: 'var(--accent)', fontWeight: 600 }}>{category._count?.products ?? 0} sản phẩm →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}