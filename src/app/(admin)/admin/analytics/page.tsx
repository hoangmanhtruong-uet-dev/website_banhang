'use client';

import { useEffect, useState } from 'react';
import { formatPrice } from '@/lib/utils';

type Analytics = {
  days: number;
  kpis: { orders: number; paidOrders: number; deliveredOrders: number; gmv: string; platformRevenue: string; averageOrderValue: string; cancelledOrders: number; returnedOrRefundedOrders: number; revenueTrend: number; users: number; sellers: number; products: number };
  funnel: Array<{ stage: string; value: number; rate: number }>;
  daily: Array<{ date: string; orders: number; delivered: number; gmv: string }>;
  topProducts: Array<{ id: string; name: string; quantity: number; revenue: string }>;
  paymentMethods: Array<{ method: string; count: number }>;
};

const card: React.CSSProperties = { padding: 22, borderRadius: 18, border: '1px solid rgba(255,255,255,.08)', background: 'rgba(15,23,42,.78)' };

export default function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setError('');
    fetch(`/api/admin/analytics?days=${days}`, { cache: 'no-store' })
      .then(async (response) => { if (!response.ok) throw new Error('Không tải được analytics'); return response.json(); })
      .then(setData).catch((reason: Error) => setError(reason.message));
  }, [days]);

  const maxGmv = Math.max(1, ...(data?.daily.map((item) => Number(item.gmv)) ?? [1]));
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 28, alignItems: 'end' }}>
      <div><h1 style={{ fontSize: 32, fontWeight: 900, margin: 0 }}>Analytics kinh doanh</h1><p style={{ opacity: .55 }}>Dữ liệu thật từ đơn hàng, payment, fulfillment và settlement.</p></div>
      <select value={days} onChange={(event) => setDays(Number(event.target.value))} style={{ padding: '10px 14px', borderRadius: 12, background: '#111827', color: 'white' }}>
        <option value={7}>7 ngày</option><option value={30}>30 ngày</option><option value={90}>90 ngày</option>
      </select>
    </div>
    {error && <div style={{ ...card, borderColor: '#ef4444', marginBottom: 20 }}>{error}</div>}
    {!data ? <div style={card}>Đang tải dữ liệu…</div> : <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          ['GMV đã giao', formatPrice(Number(data.kpis.gmv))],
          ['Doanh thu nền tảng', formatPrice(Number(data.kpis.platformRevenue))],
          ['Đơn hàng', data.kpis.orders.toLocaleString('vi-VN')],
          ['Đơn đã giao', data.kpis.deliveredOrders.toLocaleString('vi-VN')],
          ['AOV', formatPrice(Number(data.kpis.averageOrderValue))],
          ['Tăng trưởng', `${data.kpis.revenueTrend >= 0 ? '+' : ''}${data.kpis.revenueTrend}%`],
        ].map(([label, value]) => <div key={label} style={card}><div style={{ opacity: .55, fontSize: 13 }}>{label}</div><div style={{ fontWeight: 900, fontSize: 22, marginTop: 8, color: 'var(--accent)' }}>{value}</div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(280px,1fr)', gap: 18, marginBottom: 20 }}>
        <section style={card}><h3>GMV theo ngày</h3><div style={{ height: 260, display: 'flex', alignItems: 'end', gap: 5, paddingTop: 20 }}>
          {data.daily.map((item) => <div key={item.date} title={`${item.date}: ${formatPrice(Number(item.gmv))}`} style={{ flex: 1, minWidth: 3, height: `${Math.max(3, Number(item.gmv) / maxGmv * 100)}%`, background: 'linear-gradient(180deg,#f59e0b,#ea580c)', borderRadius: '5px 5px 0 0' }} />)}
        </div></section>
        <section style={card}><h3>Funnel vận hành</h3>{data.funnel.map((item) => <div key={item.stage} style={{ margin: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{item.stage}</span><b>{item.value} · {item.rate}%</b></div>
          <div style={{ height: 7, marginTop: 7, borderRadius: 9, background: 'rgba(255,255,255,.06)' }}><div style={{ width: `${item.rate}%`, height: '100%', borderRadius: 9, background: '#10b981' }} /></div>
        </div>)}</section>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <section style={card}><h3>Top sản phẩm đã giao</h3>{data.topProducts.length === 0 ? <p style={{ opacity: .5 }}>Chưa có dữ liệu.</p> : data.topProducts.map((item, index) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 10, padding: '11px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><b>#{index + 1}</b><span>{item.name} · {item.quantity} sp</span><b>{formatPrice(Number(item.revenue))}</b></div>)}</section>
        <section style={card}><h3>Phương thức thanh toán</h3>{data.paymentMethods.map((item) => <div key={item.method} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0' }}><span>{item.method}</span><b>{item.count}</b></div>)}</section>
      </div>
    </>}
  </div>;
}
