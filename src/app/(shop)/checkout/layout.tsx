import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thanh toán đơn hàng | MTRUONG-STORE',
  description: 'Thanh toán an toàn, đa dạng phương thức và giao hàng siêu tốc.',
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
