import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Product } from '@/types/product';
import { addMoneyStrings, multiplyMoneyByQuantity } from '@/lib/utils/client-money';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  ownerId: string | null;
  items: CartItem[];
  setOwner: (userId: string | null) => void;
  addItem: (product: Product, quantity: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => string;
  getItemCount: () => number;
}

export function getAvailableStock(product: Product): number {
  if (!product.inStock) return 0;
  if (typeof product.stockQuantity !== 'number') return Number.MAX_SAFE_INTEGER;
  return Math.max(0, product.stockQuantity - (product.reservedQuantity ?? 0));
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      ownerId: null,
      items: [],

      setOwner: (userId) => {
        const currentOwner = get().ownerId;
        if (currentOwner !== userId) {
          set({ ownerId: userId, items: [] });
        }
      },

      addItem: (product, quantity) => {
        const available = getAvailableStock(product);
        if (available <= 0 || quantity <= 0) return;
        const currentItems = get().items;
        const existingItem = currentItems.find(item => item.product.id === product.id);
        const currentQuantity = existingItem?.quantity ?? 0;
        const nextQuantity = Math.min(available, currentQuantity + quantity);

        if (existingItem) {
          set({
            items: currentItems.map(item =>
              item.product.id === product.id
                ? { ...item, product, quantity: nextQuantity }
                : item
            ),
          });
        } else {
          set({ items: [...currentItems, { product, quantity: Math.min(available, quantity) }] });
        }
      },

      removeItem: (productId) => {
        set({ items: get().items.filter(item => item.product.id !== productId) });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map(item =>
            item.product.id === productId
              ? { ...item, quantity: Math.min(quantity, getAvailableStock(item.product)) }
              : item
          ).filter(item => item.quantity > 0),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => addMoneyStrings(
        get().items.map(item => multiplyMoneyByQuantity(item.product.price, item.quantity))
      ),

      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
    }),
    {
      name: 'luxe-cart-storage',
    }
  )
);