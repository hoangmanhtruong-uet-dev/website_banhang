'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kh\u00f4ng th\u1ec3 g\u1eedi y\u00eau c\u1ea7u');
      setMessage(data.message || 'N\u1ebfu email t\u1ed3n t\u1ea1i, li\u00ean k\u1ebft \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u \u0111\u00e3 \u0111\u01b0\u1ee3c g\u1eedi.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'L\u1ed7i k\u1ebft n\u1ed1i server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleSubmit} className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>{'Qu\u00ean m\u1eadt kh\u1ea9u'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{'Nh\u1eadp email \u0111\u1ec3 nh\u1eadn li\u00ean k\u1ebft \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u.'}</p>
        {message && <p style={{ color: 'var(--success)', marginBottom: '16px' }}>{message}</p>}
        {error && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>}
        <label className="input-label">Email</label>
        <input className="input-field" type="email" value={email} onChange={event => setEmail(event.target.value)} required style={{ marginBottom: '20px' }} />
        <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
          {loading ? '\u0110ang g\u1eedi...' : 'G\u1eedi li\u00ean k\u1ebft \u0111\u1eb7t l\u1ea1i'}
        </button>
        <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: '20px', color: 'var(--accent)' }}>{'\u2190 Quay l\u1ea1i \u0111\u0103ng nh\u1eadp'}</Link>
      </form>
    </div>
  );
}