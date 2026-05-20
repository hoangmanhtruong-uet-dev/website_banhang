// src/app/(shop)/layout.tsx
'use client';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Đọc lại user từ cookie khi ứng dụng khởi chạy
    fetchMe();
  }, [fetchMe]);

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
    </>
  );
}
