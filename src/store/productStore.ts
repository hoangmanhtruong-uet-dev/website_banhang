import { create } from 'zustand';
import { Product } from '@/types/product';
import { mockProducts } from '@/lib/mockData';

interface ProductState {
  products: Product[];
  setProducts: (products: Product[]) => void;
}

export const useProductStore = create<ProductState>((set) => ({
  products: mockProducts,
  
  setProducts: (products) => set({ products }),
  
  // Bạn có thể thêm các hàm addProduct, updateProduct, deleteProduct gọi API ở đây
}));