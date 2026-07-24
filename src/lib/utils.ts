import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatClientMoney } from './utils/client-money'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(price: string | bigint | number): string {
  return formatClientMoney(price);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function generateOrderId(): string {
  return 'ORD-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}
