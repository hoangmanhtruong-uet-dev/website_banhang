import { CartItem } from './cart';

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingFee: number;
  shippingProvider?: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  paymentMethod: string;
  createdAt: string;
}