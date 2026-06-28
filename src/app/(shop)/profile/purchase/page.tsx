import { redirect } from 'next/navigation';

export default function PurchasePage() {
  redirect('/profile/orders');
}
