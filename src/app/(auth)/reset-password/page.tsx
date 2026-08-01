'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) return setError('Li\u00ean k\u1ebft \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u kh\u00f4ng h\u1ee3p l\u1ec7.');
    if (password.length < 6) return setError('M\u1eadt kh\u1ea9u ph\u1ea3i c\u00f3 \u00edt nh\u1ea5t 6 k\u00fd t\u1ef1.');
    if (password !== confirmPassword) return setError('M\u1eadt kh\u1ea9u x\u00e1c nh\u1eadn kh\u00f4ng kh\u1edbp.');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Kh\u00f4ng th\u1ec3 \u0111\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u');
      router.push('/login?reset=success');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'L\u1ed7i k\u1ebft n\u1ed1i server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
      <form onSubmit={handleSubmit} className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '10px' }}>{'\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u'}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>{'Ch\u1ecdn m\u1eadt kh\u1ea9u m\u1edbi c\u00f3 \u00edt nh\u1ea5t 6 k\u00fd t\u1ef1.'}</p>
        {error && <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>}
        <label className="input-label">{'M\u1eadt kh\u1ea9u m\u1edbi'}</label>
        <input className="input-field" type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} required style={{ marginBottom: '16px' }} />
        <label className="input-label">{'X\u00e1c nh\u1eadn m\u1eadt kh\u1ea9u'}</label>
        <input className="input-field" type="password" minLength={6} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required style={{ marginBottom: '20px' }} />
        <button type="submit" className="btn-primary" disabled={loading || !token} style={{ width: '100%', justifyContent: 'center', padding: '14px' }}>
          {loading ? '\u0110ang c\u1eadp nh\u1eadt...' : '\u0110\u1eb7t l\u1ea1i m\u1eadt kh\u1ea9u'}
        </button>
        <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: '20px', color: 'var(--accent)' }}>{'\u2190 Quay l\u1ea1i \u0111\u0103ng nh\u1eadp'}</Link>
      </form>
    </div>
  );
}