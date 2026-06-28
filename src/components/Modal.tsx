import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}

export default function Modal({ isOpen, title = 'Thông báo', children, onClose }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" style={backdropStyle} onClick={onClose}>
      <div className="modal-content" style={contentStyle} onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={headerStyle}>
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={closeBtnStyle}>✖</button>
        </div>
        <div className="modal-body" style={{ padding: '16px' }}>{children}</div>
      </div>
    </div>
  );
}

const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const contentStyle: React.CSSProperties = {
  background: 'var(--card-bg, #1e1e1e)',
  borderRadius: '12px',
  width: '90%',
  maxWidth: '400px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: 'var(--text-primary)',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  fontSize: '18px',
  cursor: 'pointer',
};
