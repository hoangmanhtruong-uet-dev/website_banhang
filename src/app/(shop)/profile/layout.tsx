import { Metadata } from 'next';
import ProfileLayoutClient from './ProfileLayoutClient';

export const metadata: Metadata = {
  title: 'Hồ sơ cá nhân | MTRUONG-STORE',
  description: 'Quản lý thông tin cá nhân, địa chỉ, ngân hàng và lịch sử đơn hàng tại MTRUONG-STORE.',
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <ProfileLayoutClient>{children}</ProfileLayoutClient>;
}
