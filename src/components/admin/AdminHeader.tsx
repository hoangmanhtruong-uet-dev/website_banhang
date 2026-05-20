'use client';
import { useAuthStore } from '@/store/authStore';
import { useState } from 'react';
import Link from 'next/link';

export default function AdminHeader() {
  const { user, logout } = useAuthStore();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header style={{
      height: '80px',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      background: 'rgba(15, 23, 42, 0.3)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 90
    }}>
      {/* Left side: Breadcrumb / Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'rgba(255,255,255,0.4)' }}>
          <span>Hệ thống</span>
          <span>/</span>
          <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Bảng điều khiển</span>
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
        {/* Live Indicator */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          fontSize: '12px', 
          background: 'rgba(16, 185, 129, 0.06)',
          padding: '6px 12px',
          borderRadius: '20px',
          border: '1px solid rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          fontWeight: 600
        }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Đồng bộ thời gian thực
        </div>

        {/* Notifications */}
        <button style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white',
          position: 'relative',
          transition: 'all 0.2s'
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
        >
          <span style={{ fontSize: '18px' }}>🔔</span>
          <span style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            width: '8px',
            height: '8px',
            background: 'var(--danger)',
            borderRadius: '50%'
          }}></span>
        </button>

        {/* Vertical Divider */}
        <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.08)' }}></div>

        {/* User Account Info */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '6px 12px',
              borderRadius: '14px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            {/* Avatar */}
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              color: '#000',
              fontSize: '16px'
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            
            {/* Name and Role */}
            <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>{user?.name || 'Admin'}</span>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Quản trị viên
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginLeft: '4px' }}>▼</span>
          </button>

          {/* Dropdown Menu */}
          {dropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '55px',
              right: 0,
              width: '200px',
              background: '#0f172a',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px',
              padding: '8px',
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              zIndex: 100
            }}>
              <Link href="/" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: '10px',
                color: 'rgba(255,255,255,0.7)',
                fontSize: '13px',
                transition: 'all 0.2s',
                textDecoration: 'none'
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'white'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
              >
                <span>🏠</span> Về Cửa Hàng
              </Link>
              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '6px 0' }}></div>
              <button 
                onClick={logout}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  color: '#ef4444',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'left'
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span>🚪</span> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
