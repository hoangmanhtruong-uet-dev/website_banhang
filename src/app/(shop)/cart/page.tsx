'use client';
import Link from 'next/link';
import { useCartStore } from '@/store/cartStore';
import { formatPrice } from '@/lib/utils';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotal, clearCart } = useCartStore();
  const total = getTotal();

  if (items.length === 0) {
    return (
      <div className="page-container" style={{ textAlign:'center', paddingTop:'120px' }}>
        <span style={{ fontSize:'80px', display:'block', marginBottom:'16px' }}>🛒</span>
        <h2 style={{ fontSize:'24px', fontWeight:700, marginBottom:'8px' }}>Giỏ hàng trống</h2>
        <p style={{ color:'var(--text-muted)', marginBottom:'32px' }}>Hãy thêm sản phẩm yêu thích vào giỏ hàng</p>
        <Link href="/products" className="btn-primary">🛍️ Mua sắm ngay</Link>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 style={{ fontSize:'32px', fontWeight:800, marginBottom:'40px' }}>
        Giỏ hàng <span style={{ color:'var(--accent)' }}>của bạn</span>
      </h1>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 360px', gap:'32px', alignItems:'start' }}>
        <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
          {items.map((item) => (
            <div key={item.product.id} className="glass-card" style={{ padding:'20px', display:'flex', gap:'20px', alignItems:'center' }}>
              <div style={{ width:'72px', height:'72px', borderRadius:'var(--radius-md)', background:item.product.gradient,
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px', flexShrink:0 }}>
                {item.product.emoji}
              </div>
              <div style={{ flex:1 }}>
                <Link href={`/products/${item.product.id}`} style={{ fontSize:'15px', fontWeight:600 }}>{item.product.name}</Link>
                <p style={{ fontSize:'13px', color:'var(--text-muted)' }}>{item.product.category}</p>
              </div>
              <div className="qty-controls">
                <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.quantity-1)}>−</button>
                <span className="qty-value">{item.quantity}</span>
                <button className="qty-btn" onClick={() => updateQuantity(item.product.id, item.quantity+1)}>+</button>
              </div>
              <p style={{ fontWeight:700, color:'var(--accent)', minWidth:'110px', textAlign:'right' }}>
                {formatPrice(item.product.price * item.quantity)}
              </p>
              <button onClick={() => removeItem(item.product.id)} style={{ background:'transparent', border:'none', color:'var(--text-muted)', cursor:'pointer', fontSize:'18px' }}>✕</button>
            </div>
          ))}
          <button onClick={clearCart} className="btn-danger" style={{ alignSelf:'flex-start' }}>🗑️ Xóa tất cả</button>
        </div>
        <div className="glass-card" style={{ padding:'28px', position:'sticky', top:'96px' }}>
          <h3 style={{ fontSize:'18px', fontWeight:700, marginBottom:'20px' }}>Tóm tắt đơn hàng</h3>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom:'12px' }}>
            <span style={{ color:'var(--text-secondary)' }}>Tạm tính</span><span>{formatPrice(total)}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', fontSize:'14px', marginBottom:'20px' }}>
            <span style={{ color:'var(--text-secondary)' }}>Vận chuyển</span><span style={{ color:'var(--success)' }}>Miễn phí</span>
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:'16px', display:'flex', justifyContent:'space-between', fontSize:'20px', fontWeight:700, marginBottom:'24px' }}>
            <span>Tổng</span><span style={{ color:'var(--accent)' }}>{formatPrice(total)}</span>
          </div>
          <Link href="/checkout" className="btn-primary" style={{ width:'100%', justifyContent:'center', padding:'16px' }}>Thanh toán →</Link>
          <Link href="/products" style={{ display:'block', textAlign:'center', marginTop:'16px', fontSize:'14px', color:'var(--text-muted)' }}>← Tiếp tục mua sắm</Link>
        </div>
      </div>
    </div>
  );
}
