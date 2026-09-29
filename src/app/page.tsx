'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import ProductCard from '@/components/product/ProductCard';
import { formatPrice } from '@/lib/utils';
import { Product } from '@/types/product';
import { FiMonitor, FiSpeaker, FiWatch, FiSmartphone, FiShoppingBag, FiArrowRight, FiClock, FiShoppingCart, FiGift } from 'react-icons/fi';

const CATEGORIES = [
  { name: 'Thời trang', icon: '👗', count: '2 sản phẩm sắp xếp' },
  { name: 'Công nghệ', icon: '💻', count: '4 sản phẩm thế hệ mới' },
  { name: 'Làm đẹp', icon: '💄', count: '4 dòng chăm sóc da' },
  { name: 'Gia dụng', icon: '🏠', count: '5 thiết bị đời sống' }
];

const heroStats = [
  { value: '12K+', label: 'Khách hàng tin chọn' },
  { value: '500+', label: 'Sản phẩm chất lượng' },
  { value: '99%', label: 'Đánh giá hài lòng' },
  { value: '24/7', label: 'Hỗ trợ chuyên nghiệp' },
];

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Tất cả');

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
  const featuredProducts = isProductsArray ? products.filter(p => p.badge === 'Hot' || p.badge === 'Bán chạy' || p.rating >= 4.5) : [];
  const saleProducts = isProductsArray ? products.filter(p => p.originalPrice) : [];
  
  const filteredLatest = activeTab === 'Tất cả' 
    ? products 
    : products.filter(p => p.category === activeTab);

  return (
    <div className="bg-[#0B1120] min-h-screen text-slate-200 font-sans">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 py-12 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-bold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            MTRUONG-STORE LUXURY TECH & MALL - Tháng 03/2026
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight">
            Thưởng thức mua sắm <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">cao cấp</span> với trải nghiệm ấn tượng và đẳng cấp.
          </h1>
          
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
            MTRUONG-STORE mang đến sản phẩm thời trang, công nghệ, làm đẹp và gia dụng chất lượng cao. 
            Giao hàng nhanh, đổi trả linh hoạt và dịch vụ chăm sóc khách hàng tận tâm chuẩn quốc tế.
          </p>
          
          <div className="flex items-center gap-4 pt-4">
            <Link href="/products" className="px-8 py-3.5 bg-gradient-to-r from-orange-500 to-rose-500 hover:from-orange-600 hover:to-rose-600 text-white font-bold rounded-full transition shadow-[0_0_20px_rgba(249,115,22,0.3)]">
              🛍️ Mua sắm ngay
            </Link>
            <Link href="/products" className="px-8 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-full transition border border-slate-700 flex items-center gap-2">
              Khám phá bộ sưu tập <FiArrowRight />
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-slate-800">
            {heroStats.map((stat, i) => (
              <div key={i}>
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="text-[10px] text-slate-400 font-semibold uppercase mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Showcase Cards */}
        <div className="relative h-[500px] hidden lg:block">
          <div className="absolute top-0 right-0 w-[450px] bg-[#1E293B] border border-slate-700 rounded-3xl p-6 shadow-2xl transform hover:-translate-y-2 transition duration-500 z-10">
            <div className="flex justify-between items-start mb-4">
              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded flex items-center gap-1 uppercase">
                <FiCheckCircle size={12} /> BEST PICK
              </span>
              <span className="text-emerald-400 text-xs font-bold flex items-center gap-1"><FiStar className="fill-current" /> 4.9 (1k+)</span>
            </div>
            <div className="h-48 bg-[#0F172A] rounded-xl flex items-center justify-center mb-6 overflow-hidden relative border border-slate-800">
               {/* Mock image content for showcase */}
               <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-slate-900 absolute inset-0"></div>
               <img src="https://images.unsplash.com/photo-1603302576837-37561b2e2302?auto=format&fit=crop&w=400&q=80" alt="Laptop" className="w-full h-full object-cover mix-blend-overlay opacity-50" />
               <div className="absolute text-5xl">💻</div>
            </div>
            <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">CÔNG NGHỆ CAO CẤP</p>
            <h3 className="text-xl font-bold text-white mb-2">Laptop Gaming G15 RTX 4060</h3>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-black text-orange-500">25.990.000 ₫ <span className="text-sm text-slate-500 line-through font-normal ml-2">29.990.000 ₫</span></p>
              </div>
              <button className="w-12 h-12 bg-orange-500 hover:bg-orange-600 text-white rounded-full flex items-center justify-center transition shadow-lg">
                <FiShoppingCart size={20} />
              </button>
            </div>
          </div>

          <div className="absolute bottom-10 left-0 w-[380px] bg-[#1E293B] border border-slate-700 rounded-3xl p-5 shadow-2xl transform hover:-translate-y-2 transition duration-500 z-20">
             <div className="flex gap-4">
                <div className="w-24 h-24 bg-[#0F172A] rounded-xl flex items-center justify-center shrink-0 border border-slate-800 relative overflow-hidden">
                   <div className="w-full h-full bg-gradient-to-br from-rose-900/40 to-slate-900 absolute inset-0"></div>
                   <div className="absolute text-4xl">🎧</div>
                </div>
                <div className="flex flex-col justify-center flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-bold rounded uppercase">BEST SELLER</span>
                    <span className="text-orange-400 text-[10px] font-bold">★ 4.8 (850)</span>
                  </div>
                  <h3 className="text-sm font-bold text-white mb-1 line-clamp-1">Tai Nghe Bluetooth Air Pro ANC</h3>
                  <div className="flex items-center justify-between mt-auto">
                    <p className="text-base font-black text-orange-500">2.490.000 ₫ <span className="text-[10px] text-slate-500 line-through ml-1">2.990.000 ₫</span></p>
                    <button className="w-8 h-8 bg-slate-700 hover:bg-slate-600 text-white rounded-full flex items-center justify-center transition">
                      <FiShoppingCart size={14} />
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-8 py-10 border-t border-[#1f2937]">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-orange-500">🔥</span> Danh mục nổi bật
            </h2>
            <p className="text-sm text-slate-400 mt-1">Khám phá các bộ sưu tập tuyển chọn hàng đầu MTRUONG-STORE</p>
          </div>
          <Link href="/products" className="text-sm font-semibold text-slate-300 hover:text-orange-500 transition flex items-center gap-1">
            Xem tất cả <FiArrowRight />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {CATEGORIES.map((cat, i) => (
            <Link key={cat.name} href={`/products?category=${encodeURIComponent(cat.name)}`} 
              className="bg-[#1E293B] hover:bg-[#273549] border border-slate-700 hover:border-slate-500 rounded-2xl p-6 text-center transition duration-300 group">
              <div className="w-16 h-16 mx-auto bg-slate-800 rounded-2xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform shadow-inner">
                {cat.icon}
              </div>
              <h3 className="text-white font-bold text-lg">{cat.name}</h3>
              <p className="text-xs text-slate-400 mt-1">{cat.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Flash Sale Section */}
      {saleProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-8 py-10">
          <div className="bg-gradient-to-r from-slate-900 to-[#1E293B] rounded-3xl border border-slate-700 p-8 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8 border-b border-slate-700/50 pb-6">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 px-4 py-2 rounded-xl text-white font-black tracking-widest uppercase">
                  ⚡ FLASH SALE
                </div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  Kết thúc trong:
                  <div className="flex items-center gap-1">
                    <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">04</span>:
                    <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">32</span>:
                    <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-white font-bold">12</span>
                  </div>
                </div>
              </div>
              <p className="text-sm text-slate-400 flex-1 px-4 hidden xl:block">Giảm giá cực sốc cho sản phẩm mới - Siêu ưu đãi mỗi ngày, săn ngay deal giảm sâu cho {saleProducts.length} mặt hàng.</p>
              <Link href="/flash-sale" className="px-6 py-2.5 bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/50 rounded-full text-sm font-bold transition flex items-center gap-2">
                <FiClock /> Săn deal ngay
              </Link>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
               {loading 
                  ? [...Array(4)].map((_, i) => <div key={i} className="h-80 bg-slate-800 rounded-2xl animate-pulse"></div>)
                  : saleProducts.slice(0, 4).map((p, i) => (
                    <div key={p.id} className="transform hover:-translate-y-1 transition duration-300">
                      <ProductCard product={p} index={i} />
                    </div>
                  ))
               }
            </div>
          </div>
        </section>
      )}

      {/* Latest & Featured Products Section */}
      <section className="max-w-7xl mx-auto px-8 py-10">
        <div className="flex flex-col md:flex-row items-end md:items-center justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              <span className="text-emerald-500">🌟</span> Sản phẩm nổi bật & Mới nhất
            </h2>
            <p className="text-sm text-slate-400 mt-1">Được tuyển chọn theo chất lượng, trải nghiệm cao và phản hồi tích cực nhất</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {['Tất cả', 'Công nghệ', 'Làm đẹp', 'Gia dụng', 'Thời trang'].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition border ${
                  activeTab === tab 
                    ? 'bg-slate-100 text-[#0B1120] border-slate-100' 
                    : 'bg-[#1E293B] text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading
            ? [...Array(8)].map((_, i) => <div key={i} className="h-80 bg-slate-800 rounded-2xl animate-pulse"></div>)
            : filteredLatest.slice(0, 8).map((p, i) => (
               <div key={p.id} className="transform hover:-translate-y-1 transition duration-300">
                 <ProductCard product={p} index={i} />
               </div>
            ))
          }
        </div>
        
        {filteredLatest.length > 8 && (
          <div className="text-center mt-10">
            <Link href="/products" className="inline-flex items-center gap-2 px-8 py-3 bg-transparent hover:bg-[#1E293B] border border-slate-700 rounded-full text-white font-bold transition">
              Xem thêm {filteredLatest.length - 8} sản phẩm <FiArrowRight />
            </Link>
          </div>
        )}
      </section>

      {/* Exclusive Vouchers Section */}
      <section className="max-w-7xl mx-auto px-8 py-12 border-t border-slate-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase mb-2">
              <FiGift /> VOUCHER GIỜ VÀNG
            </div>
            <h2 className="text-2xl font-black text-white flex items-center gap-2">
              Mã giảm giá <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Đặc Quyền Hôm Nay</span>
            </h2>
            <p className="text-sm text-slate-400 mt-1">Lưu ngay mã ưu đãi để áp dụng khi thanh toán đơn hàng</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <VoucherCard code="MTRUONG100K" title="Giảm 100.000 ₫" desc="Cho đơn hàng từ 1.000.000 ₫" exp="Hạn dùng: 31/03/2026" color="from-orange-600 to-amber-600" />
          <VoucherCard code="FREESHIP50K" title="Miễn Phí Vận Chuyển" desc="Giảm tối đa 50.000 ₫ cước phí" exp="Hạn dùng: Hàng ngày" color="from-emerald-600 to-teal-600" />
          <VoucherCard code="LUXURYVIP" title="Giảm 15% Đơn Hàng" desc="Áp dụng dòng sản phẩm Công nghệ" exp="Số lượng có hạn" color="from-purple-600 to-rose-600" />
        </div>
      </section>

      {/* Top Brands Showcase */}
      <section className="max-w-7xl mx-auto px-8 py-10">
        <div className="bg-[#131C2E] border border-slate-800 rounded-3xl p-8 text-center space-y-6">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            🤝 THƯƠNG HIỆU ĐỒNG HÀNH CHÍNH HÃNG 100%
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center opacity-80 hover:opacity-100 transition">
            {['APPLE', 'SAMSUNG', 'SONY', 'DYSON', 'GUCCI', 'NIKE'].map(brand => (
              <div key={brand} className="py-3 px-4 bg-slate-900/60 border border-slate-800 rounded-2xl font-black text-slate-300 text-lg tracking-wider hover:border-orange-500/50 hover:text-white transition">
                {brand}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Customer Testimonials Section */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold uppercase text-orange-400 tracking-wider">❤️ TRẢI NGHIỆM KHÁCH HÀNG</span>
          <h2 className="text-3xl font-black text-white">Khách hàng nói gì về MTRUONG-STORE?</h2>
          <p className="text-sm text-slate-400">Hơn 12,000+ đánh giá 5 sao từ khách hàng mua sắm thực tế</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <TestimonialCard
            name="Nguyễn Minh Trí"
            role="Khách hàng VIP - TP.HCM"
            avatar="👨‍💼"
            comment="Giao hàng siêu tốc 2h nội thành, tai nghe AirPods đóng gói nguyên seal chính hãng. Rất ấn tượng dịch vụ hỗ trợ tận tâm!"
            rating={5}
          />
          <TestimonialCard
            name="Lê Hoàng Anh"
            role="Khách hàng thân thiết - Hà Nội"
            avatar="👩‍💻"
            comment="Sản phẩm công nghệ đúng như mô tả, bảo hành điện tử nhanh gọn. Săn được voucher 100k giá siêu hời!"
            rating={5}
          />
          <TestimonialCard
            name="Trần Thu Thảo"
            role="Khách hàng - Đà Nẵng"
            avatar="👩‍🎨"
            comment="Đồ gia dụng chất lượng tuyệt vời, thiết kế sang trọng đẳng cấp. Nhất định sẽ ủng hộ shop lâu dài."
            rating={5}
          />
        </div>
      </section>

      {/* Newsletter VIP Subscription */}
      <section className="max-w-7xl mx-auto px-8 py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-rose-600 to-purple-700 p-8 md:p-14 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 max-w-2xl space-y-6">
            <span className="px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider">
              🎁 ƯU ĐÃI ĐÃI THÀNH VIÊN MỚI
            </span>
            <h2 className="text-3xl md:text-4xl font-black leading-tight">
              Đăng ký nhận mã giảm giá <span className="text-amber-300">100.000 ₫</span> ngay hôm nay
            </h2>
            <p className="text-white/90 text-sm leading-relaxed">
              Trở thành VIP Member để nhận thông báo sớm nhất về các đợt Flash Sale giờ vàng và chương trình quà tặng độc quyền.
            </p>

            <NewsletterForm />
          </div>
        </div>
      </section>

    </div>
  );
}

// Component Thẻ Voucher
function VoucherCard({ code, title, desc, exp, color }: { code: string; title: string; desc: string; exp: string; color: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-[#1E293B] border border-slate-700 hover:border-slate-500 rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-lg relative overflow-hidden group">
      <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${color}`}></div>
      <div className="space-y-1">
        <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">{code}</span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-xs text-slate-400">{desc}</p>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-700/60">
        <span className="text-[10px] text-slate-500 font-semibold">{exp}</span>
        <button
          onClick={handleCopy}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1 ${
            copied
              ? 'bg-emerald-500 text-white'
              : 'bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/40'
          }`}
        >
          {copied ? '✓ Đã chép' : 'Sao chép'}
        </button>
      </div>
    </div>
  );
}

// Component Thẻ Đánh Giá
function TestimonialCard({ name, role, avatar, comment, rating }: { name: string; role: string; avatar: string; comment: string; rating: number }) {
  return (
    <div className="bg-[#1E293B] border border-slate-700 rounded-2xl p-6 space-y-4 flex flex-col justify-between shadow-lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-amber-400 text-sm">
            {[...Array(rating)].map((_, i) => (
              <span key={i}>★</span>
            ))}
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded uppercase">Đã mua hàng</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed italic">"{comment}"</p>
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
        <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xl">
          {avatar}
        </div>
        <div>
          <h4 className="text-sm font-bold text-white">{name}</h4>
          <p className="text-[10px] text-slate-400">{role}</p>
        </div>
      </div>
    </div>
  );
}

// Component Form Đăng Ký
function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-white/10 backdrop-blur-md border border-white/20 px-6 py-4 rounded-2xl text-white text-sm font-bold flex items-center gap-3">
        <span>🎉</span> Cảm ơn bạn! Mã giảm giá 100K đã được gửi tới <u>{email}</u>.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md">
      <input
        type="email"
        placeholder="Nhập địa chỉ email của bạn..."
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="px-5 py-3.5 rounded-full bg-slate-950/60 border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-none focus:border-amber-400 flex-1"
      />
      <button
        type="submit"
        className="px-8 py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-full text-sm transition shadow-lg shrink-0"
      >
        Nhận mã ngay
      </button>
    </form>
  );
}

// Temporary Star icon for showcase
function FiStar({ className }: { className?: string }) {
  return <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 576 512" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M259.3 17.8L194 150.2 47.9 171.5c-26.2 3.8-36.7 36.1-17.7 54.6l105.7 103-25 145.5c-4.5 26.3 23.2 46 46.4 33.7L288 439.6l130.7 68.7c23.2 12.2 50.9-7.4 46.4-33.7l-25-145.5 105.7-103c19-18.5 8.5-50.8-17.7-54.6L382 150.2 316.7 17.8c-11.7-23.6-45.6-23.9-57.4 0z"></path></svg>;
}
function FiCheckCircle({ size = 24, className = '' }: { size?: number, className?: string }) {
  return <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className={className} height={size} width={size} xmlns="http://www.w3.org/2000/svg"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>;
}
