'use client';

import { FormEvent, useEffect, useState } from 'react';

type AuditRow = { id: string; action: string; actorId: string | null; entityType: string; entityId: string; details: unknown; createdAt: string };
type Result = { page: number; pages: number; total: number; rows: AuditRow[] };
const box: React.CSSProperties = { background: 'rgba(15,23,42,.78)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16 };

export default function AuditPage() {
  const [result, setResult] = useState<Result | null>(null);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), limit: '30' });
    if (query) params.set('action', query);
    if (entityType) params.set('entityType', entityType);
    fetch(`/api/admin/audit?${params}`, { cache: 'no-store' }).then((response) => response.json()).then(setResult);
  }, [page, query, entityType]);
  const submit = (event: FormEvent) => { event.preventDefault(); setPage(1); setQuery(action.trim()); };
  return <div>
    <h1 style={{ fontSize: 32, marginBottom: 5 }}>Audit log</h1><p style={{ opacity: .55, marginBottom: 24 }}>Lịch sử thao tác nhạy cảm và chuyển trạng thái domain.</p>
    <form onSubmit={submit} style={{ ...box, padding: 16, display: 'flex', gap: 12, marginBottom: 18 }}>
      <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Lọc action…" style={{ flex: 1, padding: 11, borderRadius: 10, background: '#111827', color: 'white' }} />
      <input value={entityType} onChange={(event) => { setEntityType(event.target.value.trim()); setPage(1); }} placeholder="Entity type…" style={{ width: 220, padding: 11, borderRadius: 10, background: '#111827', color: 'white' }} />
      <button className="btn-primary">Tìm</button>
    </form>
    <div style={{ ...box, overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}><thead><tr>{['Thời gian','Action','Actor','Đối tượng','Chi tiết'].map((label) => <th key={label} style={{ textAlign: 'left', padding: 14, opacity: .6 }}>{label}</th>)}</tr></thead><tbody>
      {result?.rows.map((row) => <tr key={row.id} style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}><td style={{ padding: 14, whiteSpace: 'nowrap' }}>{new Date(row.createdAt).toLocaleString('vi-VN')}</td><td style={{ padding: 14, color: 'var(--accent)', fontWeight: 700 }}>{row.action}</td><td style={{ padding: 14 }}>{row.actorId ?? 'SYSTEM'}</td><td style={{ padding: 14 }}>{row.entityType}<br/><small style={{ opacity: .55 }}>{row.entityId}</small></td><td style={{ padding: 14, maxWidth: 430 }}><code style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11 }}>{JSON.stringify(row.details)}</code></td></tr>)}
    </tbody></table>{result?.rows.length === 0 && <p style={{ padding: 20 }}>Không có audit log phù hợp.</p>}</div>
    {result && <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}><span>{result.total} bản ghi</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>←</button><span style={{ padding: '0 15px' }}>{page}/{Math.max(1, result.pages)}</span><button disabled={page >= result.pages} onClick={() => setPage((value) => value + 1)}>→</button></div></div>}
  </div>;
}
