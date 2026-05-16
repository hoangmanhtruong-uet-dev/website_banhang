'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import AdminSidebar from '@/components/admin/AdminSidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.push('/'); // Nếu không phải admin, đá về trang chủ
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return <div style={{ background: '#020617', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Đang xác thực quyền Admin...</div>;
  }

  return (
    <div style={{ background: '#020617', minHeight: '100vh', color: 'white' }}>
      <AdminSidebar />
      <main style={{ marginLeft: '280px', padding: '40px' }}>
        {children}
      </main>
    </div>
  );
}
