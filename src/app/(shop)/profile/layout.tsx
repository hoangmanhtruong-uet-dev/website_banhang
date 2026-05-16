'use client';
import ProfileSidebar from '@/components/profile/ProfileSidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
        {/* Sidebar duy nhất */}
        <ProfileSidebar />

        {/* Nội dung trang bên phải */}
        <main style={{ flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
