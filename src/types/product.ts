export interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  currency: 'VND';
  description: string;
  category: string;
  categoryRef?: { name: string } | null;
  rating: number;
  reviews: number;
  inStock: boolean;
  stockQuantity?: number;
  reservedQuantity?: number;
  badge?: string;
  emoji: string;
  gradient: string;
  image?: string;
  images?: { id: string; url: string }[];
}