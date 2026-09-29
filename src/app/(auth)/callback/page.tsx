'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useToastStore } from '@/components/ui/Toast';

export default function AuthCallbackPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [status, setStatus] = useState('Đang xử lý đăng nhập...');

  useEffect(() => {
    const handleCallback = async () => {
      // Lấy session từ URL fragment do Supabase trả về
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        setStatus('Lỗi xác thực: ' + error.message);
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      if (!session) {
        setStatus('Không tìm thấy phiên đăng nhập, đang quay lại...');
        setTimeout(() => router.push('/login'), 2000);
        return;
      }

      try {
        setStatus('Đang đồng bộ tài khoản với hệ thống...');
        // Gửi token lên server để đồng bộ Prisma
        const response = await fetch('/api/auth/google-verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ access_token: session.access_token }),
        });

        if (response.ok) {
          addToast('Đăng nhập Google thành công! 🎉');
          router.push('/');
          router.refresh();
        } else {
          const resData = await response.json();
          setStatus('Lỗi đồng bộ: ' + (resData.error || 'Unknown'));
          setTimeout(() => router.push('/login'), 2000);
        }
      } catch (err) {
        setStatus('Đã xảy ra lỗi mạng');
        setTimeout(() => router.push('/login'), 2000);
      }
    };

    handleCallback();
  }, [router, addToast]);

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="animate-spin" style={{ fontSize: '40px', marginBottom: '20px' }}>🌀</div>
        <h2 style={{ fontSize: '20px', fontWeight: 600 }}>{status}</h2>
      </div>
    </div>
  );
}
