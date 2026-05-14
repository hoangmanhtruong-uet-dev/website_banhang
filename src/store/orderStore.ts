import { create } from 'zustand';
import { Order, OrderStatus } from '@/types/order';
import { useToastStore } from '@/components/ui/Toast';

interface OrderState {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
  fetchOrders: () => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  
  setOrders: (orders) => set({ orders }),

  fetchOrders: async () => {
    try {
      const res = await fetch('/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const orders = await res.json();
      set({ orders });
    } catch (error) {
      console.error('Error fetching orders:', error);
      useToastStore.getState().addToast('Lỗi khi tải đơn hàng.');
    }
  },

  updateOrderStatus: async (orderId, status) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update order status');
      const updatedOrder = await res.json();
      set((state) => ({
        orders: state.orders.map((order) =>
          order.id === orderId ? updatedOrder : order
        ),
      }));
      useToastStore.getState().addToast(`Cập nhật trạng thái đơn hàng ${orderId} thành ${status}!`);
    } catch (error) {
      console.error('Error updating order status:', error);
      useToastStore.getState().addToast('Lỗi khi cập nhật trạng thái đơn hàng.');
    }
  },
}));