'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useToastStore } from '@/components/ui/Toast';
import { FiBell, FiCheckCircle, FiInfo, FiAlertCircle, FiTag } from 'react-icons/fi';

interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  type: string;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const addToast = useToastStore(s => s.addToast);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/me/notifications');
      if (!res.ok) throw new Error('Failed to fetch notifications');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (error) {
      console.error(error);
      addToast('Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      const res = await fetch('/api/me/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id }),
      });
      if (res.ok) {
        if (id) {
          setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        } else {
          setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <FiCheckCircle className="text-emerald-500" size={24} />;
      case 'warning': return <FiAlertCircle className="text-amber-500" size={24} />;
      case 'promo': return <FiTag className="text-rose-500" size={24} />;
      default: return <FiInfo className="text-blue-500" size={24} />;
    }
  };

  if (loading) {
    return (
      <div className="glass-card" style={{ padding: '40px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '32px' }}>Thông Báo</h1>
        <p className="text-slate-400">Đang tải...</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="glass-card" style={{ padding: '40px' }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800 }}>Thông Báo</h1>
          <p className="text-slate-400 mt-1">Bạn có <strong className="text-white">{unreadCount}</strong> thông báo chưa đọc</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => markAsRead()} 
            className="text-sm font-semibold text-orange-400 hover:text-orange-300 transition"
          >
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <FiBell className="mx-auto text-slate-700 mb-4" size={48} />
          <p style={{ color: 'var(--text-muted)' }}>Bạn chưa có thông báo nào.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div 
              key={notification.id} 
              onClick={() => { if (!notification.read) markAsRead(notification.id); }}
              className={`p-5 rounded-2xl border transition relative overflow-hidden group cursor-pointer ${
                notification.read 
                  ? 'bg-slate-900/40 border-slate-800' 
                  : 'bg-slate-800/80 border-slate-700 shadow-lg'
              }`}
            >
              {!notification.read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500" />
              )}
              
              <div className="flex gap-4 items-start">
                <div className={`shrink-0 p-2 rounded-xl ${notification.read ? 'bg-slate-800/50' : 'bg-slate-700/50'}`}>
                  {getIcon(notification.type)}
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className={`font-bold truncate ${notification.read ? 'text-slate-300' : 'text-white'}`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                      {new Date(notification.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  
                  <p className={`text-sm leading-relaxed ${notification.read ? 'text-slate-400' : 'text-slate-300'}`}>
                    {notification.message}
                  </p>
                  
                  {notification.link && (
                    <Link 
                      href={notification.link}
                      className="inline-block mt-3 text-sm font-semibold text-orange-400 hover:text-orange-300 transition"
                    >
                      Xem chi tiết →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}