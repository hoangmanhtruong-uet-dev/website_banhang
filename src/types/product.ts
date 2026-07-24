export interface Product {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  currency: 'VND';
  description: string;
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  badge?: string;
  emoji: string;
  gradient: string;
  image?: string;
  images?: { id: string; url: string }[];
}