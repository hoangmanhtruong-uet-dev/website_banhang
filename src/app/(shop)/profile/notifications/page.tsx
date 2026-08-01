'use client';

import { useEffect, useState } from 'react';
import { useToastStore } from '@/components/ui/Toast';

interface Notification {
  id: string;
  template: string;
  status: string;
  channel: string;
  sentAt?: string | null;
  createdAt: string;
}

const templateLabels: Record<string, string> = {
  order_created: 'Đơn hàng của bạn đã được tạo.',
  order_confirmed: 'Đơn hàng đã được xác nhận.',
  order_shipped: 'Đơn hàng đang được giao.',
  order_delivered: 'Đơn hàng đã giao thành công.',
  order_cancelled: 'Đơn hàng đã được hủy.',
  refund_completed: 'Khoản hoàn tiền đã hoàn tất.',
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(state => state.addToast);

  useEffect(() => {
    fetch('/api/user/notifications')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Không thể tải thông báo');
        setNotifications(Array.isArray(data) ? data : []);
      })
      .catch(caught => addToast(caught instanceof Error ? caught.message : 'Không thể tải thông báo'))
      .finally(() => setLoading(false));
  }, [addToast]);

  return (
    <div className="glass-card" style={{ padding: '30px', borderRadius: '24px', minHeight: '400px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '24px' }}>Thông báo</h1>
      {loading ? (
        <p>Đang tải thông báo...</p>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '60px', marginBottom: '16px' }}>🔔</div>
          Chưa có thông báo mới.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notification => (
            <article key={notification.id} style={{ padding: '18px', borderRadius: '16px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px' }}>
                <p style={{ fontWeight: 600 }}>{templateLabels[notification.template] || notification.template.replaceAll('_', ' ')}</p>
                <span style={{ color: notification.status === 'sent' ? 'var(--success)' : 'var(--text-muted)', fontSize: '12px' }}>{notification.status === 'sent' ? 'Đã gửi' : notification.status}</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '8px' }}>{new Date(notification.sentAt || notification.createdAt).toLocaleString('vi-VN')}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}