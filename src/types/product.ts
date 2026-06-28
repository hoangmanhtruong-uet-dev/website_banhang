export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
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