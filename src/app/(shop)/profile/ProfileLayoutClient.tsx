'use client';
import ProfileSidebar from '@/components/profile/ProfileSidebar';

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-container" style={{ paddingTop: '40px', paddingBottom: '80px' }}>
      <div className="profile-layout">
        {/* Sidebar duy nhất */}
        <ProfileSidebar />

        {/* Nội dung trang bên phải */}
        <main style={{ minWidth: 0 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
