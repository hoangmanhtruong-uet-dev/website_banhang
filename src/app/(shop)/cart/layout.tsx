import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Giỏ hàng của bạn | MTRUONG-STORE',
  description: 'Xem lại các sản phẩm trong giỏ hàng và tiến hành thanh toán tại MTRUONG-STORE.',
};

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
