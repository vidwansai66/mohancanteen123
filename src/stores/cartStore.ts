import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
  shop_id: string;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  clearShopCart: (shopId: string) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getShopItems: (shopId: string) => CartItem[];
  getShopTotalPrice: (shopId: string) => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find((i) => i.id === item.id && i.shop_id === item.shop_id);
          if (existingItem) {
            return {
              items: state.items.map((i) =>
                i.id === item.id && i.shop_id === item.shop_id
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        });
      },
      
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((i) => i.id !== id),
        }));
      },
      
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity } : i
          ),
        }));
      },
      
      clearCart: () => set({ items: [] }),
      
      clearShopCart: (shopId) => set((state) => ({
        items: state.items.filter(i => i.shop_id !== shopId)
      })),
      
      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },
      
      getTotalPrice: () => {
        return get().items.reduce(
          (total, item) => total + item.price * item.quantity,
          0
        );
      },
      
      getShopItems: (shopId) => {
        return get().items.filter(item => item.shop_id === shopId);
      },
      
      getShopTotalPrice: (shopId) => {
        return get().items
          .filter(item => item.shop_id === shopId)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'canteen-cart',
    }
  )
);
