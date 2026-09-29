import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm | MTRUONG-STORE',
  description: 'Khám phá hàng ngàn sản phẩm công nghệ, thời trang, làm đẹp chính hãng với giá tốt nhất tại MTRUONG-STORE.',
};

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
