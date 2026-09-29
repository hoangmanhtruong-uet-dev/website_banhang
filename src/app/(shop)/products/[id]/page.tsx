'use client';

import { useParams, usePathname, useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils';
import { compareMoneyStrings, percentageOff } from '@/lib/utils/client-money';
import { useState, useEffect, useTransition } from 'react';
import { getAvailableStock, useCartStore } from '@/store/cartStore';
import { useToastStore } from '@/components/ui/Toast';
import { Product } from '@/types/product';
import { useAuthStore } from '@/store/authStore';
import SafeImage from '@/components/common/SafeImage';
import { getCategoryProductImage } from '@/lib/upload/product-image';
import ProductCard from '@/components/product/ProductCard';
import Link from 'next/link';
import {
  FiHeart, FiShare2, FiShoppingCart, FiZap, FiTruck, FiShield,
  FiRefreshCw, FiStar, FiClock, FiCheckCircle, FiInfo, FiSliders,
  FiMessageSquare, FiFileText, FiArrowRight
} from 'react-icons/fi';
import ProductReviews from '@/components/shop/ProductReviews';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuthStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState('Matte Black (Đen mờ Carbon)');
  const [activeTab, setActiveTab] = useState<'specs' | 'highlights' | 'reviews' | 'warranty'>('specs');
  const [isLiked, setIsLiked] = useState(false);
  const [isPending, startTransition] = useTransition();

  const addItem = useCartStore(s => s.addItem);
  const addToast = useToastStore(s => s.addToast);

  // Countdown timer cho Flash Sale Ticker
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 45, seconds: 6 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/products/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(data => {
        setProduct(data);
        if (data.category) {
          fetch(`/api/products?category=${encodeURIComponent(data.category)}`)
            .then(r => r.json())
            .then(list => {
              if (Array.isArray(list)) {
                setRelatedProducts(list.filter((p: Product) => p.id !== data.id).slice(0, 4));
              }
            })
            .catch(() => setRelatedProducts([]));
        }
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [id]);

  // Load trạng thái wishlist
  useEffect(() => {
    if (!id || !isAuthenticated) return;
    fetch('/api/me/wishlist')
      .then(res => res.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          const liked = data.some(item => item.productId === id);
          setIsLiked(liked);
        }
      })
      .catch(console.error);
  }, [id, isAuthenticated]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để lưu sản phẩm yêu thích.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    const previousState = isLiked;
    setIsLiked(!isLiked); // Optimistic UI
    
    try {
      const res = await fetch(`/api/me/wishlist${previousState ? `?productId=${id}` : ''}`, {
        method: previousState ? 'DELETE' : 'POST',
        headers: previousState ? undefined : { 'Content-Type': 'application/json' },
        body: previousState ? undefined : JSON.stringify({ productId: id }),
      });
      if (!res.ok) throw new Error('Failed to toggle wishlist');
      addToast(previousState ? 'Đã xóa khỏi danh sách yêu thích' : 'Đã thêm vào danh sách yêu thích 💖');
    } catch {
      setIsLiked(previousState); // Revert on failure
      addToast('Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B1120] p-8 max-w-7xl mx-auto space-y-8">
        <div className="h-6 bg-slate-800 rounded w-1/3 animate-pulse"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="h-[480px] bg-slate-900 rounded-3xl animate-pulse"></div>
          <div className="space-y-6">
            <div className="h-10 bg-slate-800 rounded w-3/4 animate-pulse"></div>
            <div className="h-12 bg-slate-900 rounded w-1/2 animate-pulse"></div>
            <div className="h-32 bg-slate-900 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-[#0B1120] text-slate-200 flex flex-col items-center justify-center p-8">
        <span className="text-6xl mb-4">😞</span>
        <h2 className="text-2xl font-bold text-white mb-2">Sản phẩm không tồn tại</h2>
        <p className="text-slate-400 mb-6">Sản phẩm này có thể đã bị xóa hoặc không còn khả dụng.</p>
        <Link href="/products" className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-full transition">
          ← Quay lại cửa hàng
        </Link>
      </div>
    );
  }

  const availableStock = getAvailableStock(product);
  const hasDiscount = Boolean(product.originalPrice && compareMoneyStrings(product.originalPrice, product.price) > 0);
  const mainImage = product.images?.[activeImageIndex]?.url || product.image;
  const imageFallback = getCategoryProductImage(product.category || product.categoryRef?.name);

  const curPriceNum = Number(product.price) || 0;
  const origPriceNum = Number(product.originalPrice) || 0;
  const savingsAmount = origPriceNum > curPriceNum ? origPriceNum - curPriceNum : 0;
  const discountPercent = origPriceNum > curPriceNum ? Math.round(((origPriceNum - curPriceNum) / origPriceNum) * 100) : 0;

  const handleAddToCart = () => {
    if (isAuthLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    startTransition(() => {
      addItem(product, qty);
      addToast(`Đã thêm ${qty} x ${product.name} vào giỏ hàng! 🛒`);
    });
  };

  const handleBuyNow = () => {
    if (isAuthLoading || availableStock <= 0) return;
    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập để tiếp tục thanh toán.');
      router.push('/login?from=' + encodeURIComponent(pathname || '/'));
      return;
    }
    startTransition(() => {
      addItem(product, qty);
      router.push('/checkout');
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      addToast('Đã sao chép đường dẫn sản phẩm! 🔗');
    }
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: mainImage ? [mainImage] : [],
    description: product.description || product.name,
    sku: (product as any).sku || product.id,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'VND',
      price: product.price,
      availability: availableStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: 'MTRUONG-STORE',
      },
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: String(product.rating || '5.0'),
      reviewCount: String(product.reviews || '286'),
    },
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-slate-200 font-sans pb-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* Top Breadcrumb & Flash Sale Ticker Bar */}
      <div className="border-b border-slate-800 bg-[#0F172A]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-slate-400 overflow-x-auto">
            <Link href="/" className="hover:text-white transition">Trang chủ</Link>
            <span>/</span>
            <Link href="/products" className="hover:text-white transition">{product.category}</Link>
            <span>/</span>
            <span className="text-white font-semibold line-clamp-1">{product.name}</span>
          </div>

          <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-rose-500/20 border border-orange-500/30 px-3 py-1 rounded-full text-orange-400 font-bold shrink-0">
            <FiZap className="animate-pulse" />
            <span>FLASH SALE ĐANG DIỄN RA</span>
            <span className="text-slate-500">|</span>
            <span>Kết thúc sau</span>
            <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-white text-[11px]">
              {String(timeLeft.hours).padStart(2, '0')} : {String(timeLeft.minutes).padStart(2, '0')} : {String(timeLeft.seconds).padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-12">
        
        {/* Main Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Left Column: Gallery & Highlights (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Image Box */}
            <div className="relative rounded-3xl bg-gradient-to-b from-[#1E293B] to-[#0F172A] border border-slate-700/80 overflow-hidden shadow-2xl p-6 group">
              
              {/* Badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                {hasDiscount && (
                  <span className="bg-rose-600 text-white text-[11px] font-black px-3 py-1 rounded-full shadow-lg tracking-wider">
                    -{discountPercent}% GIẢM
                  </span>
                )}
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 backdrop-blur-md text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                  CHÍNH HÃNG 100%
                </span>
              </div>

              {product.badge && (
                <div className="absolute top-4 right-4 z-10 bg-orange-500 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                  {product.badge}
                </div>
              )}

              {/* Glowing Halo Effect behind image */}
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 via-rose-500/5 to-indigo-500/10 rounded-3xl blur-2xl opacity-60"></div>

              {/* Image Container */}
              <div className="relative h-[380px] w-full flex items-center justify-center">
                {mainImage ? (
                  <SafeImage
                    src={mainImage}
                    fallbackSrc={imageFallback}
                    alt={product.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 500px"
                    style={{ objectFit: 'contain' }}
                    className="transform group-hover:scale-105 transition duration-500 drop-shadow-[0_20px_30px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <span className="text-9xl drop-shadow-[0_15px_25px_rgba(0,0,0,0.5)]">
                    {product.emoji}
                  </span>
                )}
              </div>

              {/* 360 View Button Overlay */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                <button className="px-4 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 text-xs font-bold hover:text-white hover:border-orange-500 transition flex items-center gap-1.5 shadow-lg">
                  🎥 Xem chi tiết 360°
                </button>
              </div>
            </div>

            {/* Thumbnails Row */}
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.map((img: any, i: number) => (
                  <button
                    key={img.id || i}
                    onClick={() => setActiveImageIndex(i)}
                    className={`relative h-20 rounded-2xl overflow-hidden border-2 transition p-1 bg-slate-900/60 ${
                      activeImageIndex === i
                        ? 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <SafeImage
                      src={img.url}
                      fallbackSrc={imageFallback}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      fill
                      sizes="80px"
                      style={{ objectFit: 'cover' }}
                      className="rounded-xl"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Features Grid Below Image */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">✨</span>
                <div>
                  <h4 className="text-xs font-bold text-white">Âm Thanh Hi-Res Chuẩn</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Giải mã LDAC & aptX HD</p>
                </div>
              </div>
              <div className="bg-[#1E293B]/70 border border-slate-800 rounded-2xl p-4 flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <h4 className="text-xs font-bold text-white">30 Ngày 1 Đổi 1</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Lỗi phần cứng từ NSX</p>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Main Info & Buying Panel (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Category Tag & Action Header */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase rounded-full tracking-wider">
                  HI-RES AUDIO
                </span>
                <span className="px-3 py-1 bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase rounded-full tracking-wider">
                  FLAGSHIP SERIES
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleWishlist}
                  className={`w-9 h-9 rounded-full border flex items-center justify-center transition ${
                    isLiked
                      ? 'bg-rose-500/20 border-rose-500 text-rose-500'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title={isLiked ? "Đã yêu thích" : "Thêm vào yêu thích"}
                >
                  <FiHeart className={isLiked ? 'fill-current' : ''} size={16} />
                </button>
                <button
                  onClick={handleShare}
                  className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
                  title="Chia sẻ sản phẩm"
                >
                  <FiShare2 size={16} />
                </button>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white leading-tight">
              {product.name}
            </h1>

            {/* Rating & Social Proof */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <FiStar key={i} className="fill-current" size={14} />
                  ))}
                </div>
                <span className="text-white text-sm font-black ml-1">{product.rating || '5.0'}</span>
              </div>
              <span className="text-slate-700">•</span>
              <span><strong className="text-white">{product.reviews || 286}</strong> đánh giá thực tế</span>
              <span className="text-slate-700">•</span>
              <span><strong className="text-white">1.4K</strong> đã bán ra</span>
              <span className="text-slate-700">•</span>
              <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                ✅ Phổ Biến Nhất
              </span>
            </div>

            {/* Price Box */}
            <div className="bg-gradient-to-r from-[#1E293B] to-[#172033] border border-slate-700/80 rounded-2xl p-6 space-y-3 shadow-xl">
              <div className="flex items-baseline gap-4">
                <span className="text-3xl sm:text-4xl font-black text-orange-500">
                  {formatPrice(product.price)}
                </span>
                {hasDiscount && product.originalPrice && (
                  <span className="text-lg text-slate-500 line-through font-normal">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
                {hasDiscount && (
                  <span className="bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-bold px-2.5 py-1 rounded-full">
                    Tiết kiệm: {formatPrice(savingsAmount)} (-{discountPercent}%)
                  </span>
                )}
              </div>

              {/* Stock Bar Ticker */}
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] font-bold">
                  <span className="text-orange-400 flex items-center gap-1">
                    🔥 Đang bán rất chạy: Đã đặt trước 86%
                  </span>
                  <span className="text-slate-400">Chỉ còn {availableStock} chiếc</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-rose-500 rounded-full w-[86%]"></div>
                </div>
              </div>
            </div>

            {/* Short Description */}
            <p className="text-slate-300 text-sm leading-relaxed">
              {product.description || 'Tai nghe không dây cao cấp trang bị công nghệ khử tiếng ồn chủ động Hybrid ANC 42dB. Đệm tai công nghệ bọc da Protein mềm mại ôm sát, hợp tính màng loa Dynamic 40mm tinh chỉnh chuẩn âm thanh audiophile.'}
            </p>

            {/* Color Variant Selector */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Màu sắc lựa chọn:</span>
                <span className="text-orange-400 font-semibold">{selectedColor}</span>
              </label>
              <div className="flex flex-wrap gap-3">
                {[
                  { name: 'Matte Black (Đen mờ Carbon)', color: 'bg-slate-900 border-slate-600' },
                  { name: 'Space Gray', color: 'bg-slate-700 border-slate-500' },
                  { name: 'Midnight Blue', color: 'bg-indigo-950 border-indigo-700' }
                ].map(variant => (
                  <button
                    key={variant.name}
                    onClick={() => setSelectedColor(variant.name)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
                      selectedColor === variant.name
                        ? 'border-orange-500 bg-orange-500/10 text-white shadow-lg'
                        : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full border ${variant.color}`}></span>
                    {variant.name.split(' ')[0]} {variant.name.split(' ')[1]}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector & Stock Status */}
            <div className="flex items-center gap-4 pt-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Số lượng:</span>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-3.5 py-2 text-slate-400 hover:text-white font-bold text-base transition"
                >
                  −
                </button>
                <span className="px-4 py-2 text-white font-mono font-bold text-sm">
                  {qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(availableStock, qty + 1))}
                  disabled={qty >= availableStock}
                  className="px-3.5 py-2 text-slate-400 hover:text-white font-bold text-base transition disabled:opacity-30"
                >
                  +
                </button>
              </div>
              <span className="text-xs text-slate-400">
                Còn <strong className="text-white">{availableStock}</strong> sản phẩm trong kho
              </span>
            </div>

            {/* Action Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <button
                onClick={handleAddToCart}
                disabled={isPending || isAuthLoading || availableStock <= 0}
                className="px-6 py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-sm transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                <FiShoppingCart size={18} />
                <span>{availableStock <= 0 ? 'Hết hàng' : isPending ? 'Đang thêm...' : 'Thêm Vào Giỏ Hàng'}</span>
              </button>

              <button
                onClick={handleBuyNow}
                disabled={isPending || isAuthLoading || availableStock <= 0}
                className="px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-sm transition flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 disabled:opacity-50"
              >
                <FiZap size={18} />
                <span>Mua Ngay 1 Chạm</span>
              </button>
            </div>

            {/* Policy & Guarantees List */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <FiTruck className="text-orange-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Miễn Phí Vận Chuyển Hỏa Tốc Toàn Quốc</h4>
                  <p className="text-slate-400 mt-0.5">Giao siêu tốc 2h nội thành TP.HCM & Hà Nội cho đơn từ 2.000.000 ₫.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiShield className="text-emerald-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Bảo Hành Chính Hãng 12 Tháng 1 Đổi 1</h4>
                  <p className="text-slate-400 mt-0.5">Trung tâm bảo hành ủy quyền Bitexco Financial Tower, Quận 1, TP.HCM.</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <FiRefreshCw className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="font-bold text-white">Cam Kết Hoàn Tiền 200%</h4>
                  <p className="text-slate-400 mt-0.5">Bảo vệ quyền lợi tuyệt đối nếu phát hiện hàng giả, hàng không nguyên seal.</p>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Feature Highlight Banner (Middle Banner from Screenshot) */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-[#1E293B] to-slate-900 border border-slate-700/80 p-8 md:p-12 overflow-hidden relative shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-7 space-y-6">
              <span className="px-3 py-1 bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[10px] font-black uppercase rounded-full tracking-wider">
                CÔNG NGHỆ TRIỆT ỒN TẦNG SÂU
              </span>

              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Tách biệt thế giới ồn ào. Hòa mình vào không gian âm nhạc thuần khiết.
              </h2>

              <p className="text-slate-300 text-sm leading-relaxed">
                Trang bị hệ thống 4 micro kép thu và đảo pha sóng âm tần số thấp, Air Pro ANC nếp triệt đến 98% tiếng ồn động cơ máy bay, xe buýt và môi trường văn phòng. Cho bạn khoảng không tĩnh lặng để tập trung sáng tạo hoặc thưởng thức trọn vẹn từng dải âm trầm uy lực.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-orange-400">42 dB</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Độ khử ồn ANC</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white">40 Giờ</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Thời lượng pin nhất</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-black text-white">40 mm</p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold mt-1">Màng loa Dynamic PET</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 relative h-64 sm:h-80 rounded-2xl overflow-hidden border border-slate-700 shadow-2xl">
              <img
                src="https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=800&q=80"
                alt="Technology Banner"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent"></div>
              <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-md p-3 rounded-xl border border-slate-700 text-xs font-semibold text-slate-200">
                🎧 Giả lập âm thanh vòm 360° Spatial Audio sống động như tại phòng thu chuyên nghiệp.
              </div>
            </div>

          </div>
        </div>

        {/* Tabbed Technical Specifications Section */}
        <div className="space-y-6 pt-4">
          
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
            {[
              { id: 'specs', label: 'Thông Số Kỹ Thuật', icon: FiSliders },
              { id: 'highlights', label: 'Đặc Điểm Nổi Bật & ANC', icon: FiZap },
              { id: 'reviews', label: `Đánh Giá Từ Khách Hàng (${product.reviews || 286})`, icon: FiMessageSquare },
              { id: 'warranty', label: 'Chính Sách & Bảo Hành VIP', icon: FiShield }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-3 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                    activeTab === tab.id
                      ? 'bg-slate-800 text-white border border-slate-700 shadow-lg'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon size={14} className={activeTab === tab.id ? 'text-orange-400' : ''} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="bg-[#1E293B]/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            
            {activeTab === 'specs' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Tech Specs Block 1 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-orange-400">⚙️</span> Kết Nối & Xử Lý Tín Hiệu
                  </h3>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold w-1/3">Phiên bản Bluetooth</td>
                        <td className="py-2.5 text-white font-medium">Bluetooth 5.3 Low Latency (45ms)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Khoảng cách kết nối ổn định</td>
                        <td className="py-2.5 text-white font-medium">Lên đến 15 mét không vật cản</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Codecs hỗ trợ</td>
                        <td className="py-2.5 text-white font-medium">LDAC, AAC, SBC, aptX Adaptive</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Hỗ trợ kết nối kép</td>
                        <td className="py-2.5 text-white font-medium">2 Thiết bị đồng thời (Dual-Pairing)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Cổng kết nối có dây</td>
                        <td className="py-2.5 text-white font-medium">Jack 3.5mm AUX Audiophile mạ vàng</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tech Specs Block 2 */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                    <span className="text-emerald-400">🔋</span> Pin, Năng Lượng & Thiết Kế
                  </h3>
                  <table className="w-full text-xs">
                    <tbody className="divide-y divide-slate-800/60">
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold w-1/3">Dung lượng Pin</td>
                        <td className="py-2.5 text-white font-medium">750 mAh Lithium-Polymer cao cấp</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Thời gian sử dụng bật ANC</td>
                        <td className="py-2.5 text-white font-medium">32 giờ liên tục</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Thời gian sử dụng tắt ANC</td>
                        <td className="py-2.5 text-white font-medium">40 - 45 giờ</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Công nghệ sạc nhanh</td>
                        <td className="py-2.5 text-white font-medium">Type-C Fast Charge (10 phút = 4 giờ nghe)</td>
                      </tr>
                      <tr>
                        <td className="py-2.5 text-slate-400 font-semibold">Trọng lượng tai nghe</td>
                        <td className="py-2.5 text-white font-medium">248 gram (Siêu nhẹ không áp lực tai)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {activeTab === 'highlights' && (
              <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                <h3 className="text-base font-bold text-white">Điểm Nổi Bật Thiết Kế & Trải Nghiệm MTRUONG-STORE</h3>
                <p>
                  - Màng loa Dynamic 40mm cấu trúc tinh thể PET kép tái tạo âm bass sâu tới 15Hz và treble trong trẻo lên đến 40kHz.
                </p>
                <p>
                  - Đệm tai công nghệ Memory Foam bọc da Protein cao cấp đảm bảo sự thoải mái suốt 8 tiếng làm việc liên tục.
                </p>
                <p>
                  - Chế độ Xuyên Âm (Transparency Mode) cho phép lắng nghe cuộc trò chuyện xung quanh mà không cần tháo tai nghe.
                </p>
              </div>
            )}

            {activeTab === 'reviews' && (
              <ProductReviews productId={product.id} />
            )}

            {activeTab === 'warranty' && (
              <div className="space-y-3 text-xs text-slate-300">
                <h3 className="text-sm font-bold text-white">Chính Sách Bảo Hành VIP MTRUONG-STORE</h3>
                <p>• Bảo hành 12 tháng chính hãng 1 đổi 1 trong 30 ngày nếu phát sinh lỗi phần cứng.</p>
                <p>• Miễn phí giao nhận hàng bảo hành tận nhà trên toàn quốc.</p>
              </div>
            )}

          </div>

        </div>

        {/* Related Products Grid */}
        {relatedProducts.length > 0 && (
          <div className="space-y-6 pt-6">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-[10px] font-bold text-orange-400 tracking-widest uppercase">HỆ SINH THÁI THƯƠNG LƯU</span>
                <h2 className="text-2xl font-black text-white mt-1">Sản phẩm gợi ý cùng danh mục</h2>
              </div>
              <Link href="/products" className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1 transition">
                Xem tất cả danh mục <FiArrowRight />
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
