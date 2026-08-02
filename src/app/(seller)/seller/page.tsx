'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatPrice } from '@/lib/utils';

type Analytics = {
  totalRevenue: string; periodRevenue: string; revenueTrend: number; totalOrders: number;
  deliveredOrders: number; pendingOrders: number; products: number; lowStock: number; rating: number;
  dailyRevenue: { date: string; revenue: string }[];
};

export default function SellerDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetch('/api/seller/analytics?days=30').then(async response => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? body.error ?? 'Không tải được dữ liệu');
    setData(body);
  }).catch(reason => setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu')); }, []);

  if (error) return <div className="glass-card" style={{ padding: 24, color: '#ef4444' }}>{error}</div>;
  if (!data) return <div className="glass-card" style={{ padding: 24 }}>Đang tải dữ liệu Seller...</div>;
  const cards = [
    ['Doanh thu đã giao', formatPrice(data.totalRevenue), `${data.revenueTrend >= 0 ? '+' : ''}${data.revenueTrend}% trong 30 ngày`],
    ['Đơn của shop', data.totalOrders.toString(), `${data.pendingOrders} đơn cần xử lý`],
    ['Đánh giá sản phẩm', data.rating.toFixed(1), `${data.deliveredOrders} đơn đã giao`],
    ['Sản phẩm đang bán', data.products.toString(), `${data.lowStock} sản phẩm sắp hết hàng`],
  ];
  const max = Math.max(...data.dailyRevenue.map(item => Number(item.revenue)), 1);
  return <div>
    <div style={{ marginBottom: 30 }}><h1 style={{ fontSize: 28, fontWeight: 800 }}>Bảng điều khiển Seller</h1><p style={{ color: 'var(--text-muted)' }}>Doanh thu chỉ ghi nhận fulfillment của shop đã giao thành công.</p></div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 20, marginBottom: 30 }}>{cards.map(([label,value,note]) => <div key={label} className="glass-card" style={{ padding: 24 }}><p style={{ color:'var(--text-muted)', margin: 0 }}>{label}</p><h2 style={{ color:'var(--accent)', margin:'10px 0' }}>{value}</h2><small>{note}</small></div>)}</div>
    <div className="glass-card" style={{ padding: 24, marginBottom: 30 }}><h3>Doanh thu 30 ngày</h3><div style={{ height: 190, display:'flex', alignItems:'end', gap: 4 }}>{data.dailyRevenue.map(item => <div key={item.date} title={`${item.date}: ${formatPrice(item.revenue)}`} style={{ flex:1, minWidth:3, height:`${Math.max(3, Number(item.revenue) / max * 100)}%`, background:'var(--accent)', borderRadius:'4px 4px 0 0' }} />)}</div></div>
    <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}><Link className="btn-secondary" href="/seller/orders">Xử lý đơn hàng</Link><Link className="btn-secondary" href="/seller/products/new">Thêm sản phẩm</Link><Link className="btn-secondary" href="/seller/marketing">Quản lý voucher</Link></div>
  </div>;
}