'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';
import { useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/components/ui/Toast';
import { FiShoppingCart, FiTrash2, FiHeart } from 'react-icons/fi';
import SafeImage from '@/components/common/SafeImage';
import { getCategoryProductImage } from '@/lib/upload/product-image';

interface WishlistItem {
  id: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    slug: string;
    price: string;
    originalPrice: string | null;
    image: string | null;
    emoji: string | null;
    gradient: string | null;
    inStock: boolean;
    rating: number;
    reviews: number;
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);

  const fetchWishlist = async () => {
    try {
      const res = await fetch('/api/me/wishlist');
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      addToast('Không thể tải danh sách yêu thích');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      const res = await fetch(`/api/me/wishlist?productId=${productId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to remove');
      setItems(prev => prev.filter(item => item.product.id !== productId));
      addToast('Đã xóa khỏi danh sách yêu thích');
    } catch {
      addToast('Có lỗi xảy ra, vui lòng thử lại');
    }
  };

  const handleAddToCart = (product: WishlistItem['product']) => {
    if (!product.inStock) {
      addToast('Sản phẩm đã hết hàng');
      return;
    }
    addItem(product as any, 1);
    addToast(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px' }}>Sản phẩm yêu thích</h1>
        <p className="text-slate-400">Đang tải...</p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ padding: '40px' }}>
      <div className="flex items-center justify-between mb-8">
        <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Sản phẩm yêu thích</h1>
        <span className="text-slate-400 font-semibold">{items.length} sản phẩm</span>
      </div>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FiHeart className="mx-auto text-slate-700 mb-4" size={48} />
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>Bạn chưa có sản phẩm yêu thích nào.</p>
          <Link href="/products" className="text-orange-500 hover:text-orange-400 font-bold transition">
            Khám phá sản phẩm ngay →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map(({ id, product }) => (
            <div key={id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition flex flex-col group">
              <div className="relative aspect-square bg-slate-900 flex items-center justify-center p-6">
                <SafeImage
                  src={getCategoryProductImage(product.image || null)}
                  alt={product.name}
                  width={200}
                  height={200}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                />
                {!product.inStock && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <span className="bg-slate-800 text-slate-300 font-bold px-4 py-2 rounded-xl text-sm backdrop-blur-md">
                      Hết hàng
                    </span>
                  </div>
                )}
                <button
                  onClick={() => handleRemove(product.id)}
                  className="absolute top-3 right-3 w-8 h-8 bg-black/40 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 rounded-full flex items-center justify-center backdrop-blur-md transition"
                  title="Xóa khỏi danh sách"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>

              <div className="p-4 flex flex-col flex-1">
                <Link href={`/products/${product.slug || product.id}`} className="font-bold text-slate-200 hover:text-white line-clamp-2 mb-2 transition">
                  {product.name}
                </Link>
                
                <div className="flex items-center gap-2 mb-4 mt-auto pt-2">
                  <span className="text-orange-400 font-black text-lg">
                    {formatPrice(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-slate-500 line-through text-xs">
                      {formatPrice(product.originalPrice)}
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={!product.inStock}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiShoppingCart size={16} />
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
