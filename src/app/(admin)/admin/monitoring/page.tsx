'use client';

import { useCallback, useEffect, useState } from 'react';

type Monitoring = {
  status: string;
  timestamp: string;
  database: { connected: boolean; latencyMs: number };
  worker: null | { id: string; status: string; version: string; healthy: boolean; lastPollAt: string; expiresAt: string; lastError: string | null };
  metrics: Record<string, number>;
  anomalies: Array<{ type: string; entityId: string; detail: Record<string, unknown> }>;
};
const panel: React.CSSProperties = { padding: 22, border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, background: 'rgba(15,23,42,.78)' };

export default function MonitoringPage() {
  const [data, setData] = useState<Monitoring | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => fetch('/api/admin/monitoring', { cache: 'no-store' }).then(async (response) => {
    if (!response.ok) throw new Error('Không tải được trạng thái hệ thống');
    return response.json();
  }).then(setData).catch((reason: Error) => setError(reason.message)), []);
  useEffect(() => { load(); const timer = setInterval(load, 30_000); return () => clearInterval(timer); }, [load]);
  return <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}><div><h1 style={{ margin: 0, fontSize: 32 }}>Monitoring</h1><p style={{ opacity: .55 }}>Database, outbox worker, notification, payout và lỗi vận hành.</p></div><button className="btn-primary" onClick={load}>Làm mới</button></div>
    {error && <div style={{ ...panel, borderColor: '#ef4444' }}>{error}</div>}
    {data && <>
      <div style={{ ...panel, borderColor: data.status === 'healthy' ? '#10b981' : '#f59e0b', marginBottom: 18 }}>
        <b style={{ color: data.status === 'healthy' ? '#10b981' : '#f59e0b' }}>{data.status === 'healthy' ? '● HEALTHY' : '● DEGRADED'}</b>
        <span style={{ marginLeft: 20, opacity: .65 }}>DB {data.database.latencyMs} ms · Worker {data.worker?.healthy ? 'ready' : 'not ready'} · {new Date(data.timestamp).toLocaleString('vi-VN')}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginBottom: 18 }}>
        {Object.entries(data.metrics).map(([key, value]) => <div key={key} style={panel}><div style={{ opacity: .55, fontSize: 12, wordBreak: 'break-word' }}>{key}</div><div style={{ fontSize: 25, fontWeight: 900, marginTop: 8 }}>{value}</div></div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 18 }}>
        <section style={panel}><h3>Outbox worker</h3>{data.worker ? <><p><b>{data.worker.status}</b> · {data.worker.version}</p><p style={{ opacity: .65, fontSize: 13, wordBreak: 'break-all' }}>{data.worker.id}</p><p style={{ opacity: .65 }}>Poll gần nhất: {new Date(data.worker.lastPollAt).toLocaleString('vi-VN')}</p>{data.worker.lastError && <p style={{ color: '#ef4444' }}>{data.worker.lastError}</p>}</> : <p style={{ color: '#f59e0b' }}>Chưa có heartbeat.</p>}</section>
        <section style={panel}><h3>Anomaly gần nhất</h3>{data.anomalies.length === 0 ? <p style={{ color: '#10b981' }}>Không phát hiện bất thường.</p> : data.anomalies.map((item) => <div key={item.type + item.entityId} style={{ padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,.06)' }}><b style={{ color: '#f59e0b' }}>{item.type}</b><span style={{ marginLeft: 12, opacity: .65 }}>{item.entityId}</span></div>)}</section>
      </div>
    </>}
  </div>;
}
