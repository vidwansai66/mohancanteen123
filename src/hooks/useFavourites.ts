import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Order, OrderItem } from './useOrders';

export interface FavouriteItem {
  id: string;
  user_id: string;
  menu_item_id: string;
  created_at: string;
  menu_item?: {
    id: string;
    name: string;
    price: number;
    category: string;
    image_url: string | null;
    in_stock: boolean;
    shop_id: string | null;
  };
}

export interface FavouriteOrder {
  id: string;
  user_id: string;
  order_id: string;
  created_at: string;
  order?: Order;
}

export const useFavourites = () => {
  const { user } = useUser();
  const { toast } = useToast();
  const [favouriteItems, setFavouriteItems] = useState<FavouriteItem[]>([]);
  const [favouriteOrders, setFavouriteOrders] = useState<FavouriteOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchFavourites = async () => {
    if (!user) return;

    // Fetch favourite items with menu item details
    const { data: itemsData, error: itemsError } = await supabase
      .from('favourite_items')
      .select(`
        *,
        menu_item:menu_items (id, name, price, category, image_url, in_stock, shop_id)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (itemsError) {
      console.error('Error fetching favourite items:', itemsError);
    } else {
      setFavouriteItems(itemsData?.map(item => ({
        ...item,
        menu_item: item.menu_item as FavouriteItem['menu_item']
      })) || []);
    }

    // Fetch favourite orders with order details
    const { data: ordersData, error: ordersError } = await supabase
      .from('favourite_orders')
      .select(`
        *,
        order:orders (
          *,
          order_items (*)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching favourite orders:', ordersError);
    } else {
      setFavouriteOrders(ordersData?.map(fav => ({
        ...fav,
        order: fav.order ? {
          id: fav.order.id,
          user_id: fav.order.user_id,
          shop_id: (fav.order as any).shop_id || null,
          status: fav.order.status as Order['status'],
          payment_status: ((fav.order as any).payment_status || 'unpaid') as Order['payment_status'],
          total: fav.order.total,
          notes: fav.order.notes,
          utr_number: (fav.order as any).utr_number || null,
          payment_screenshot_url: (fav.order as any).payment_screenshot_url || null,
          payment_verified: (fav.order as any).payment_verified || null,
          created_at: fav.order.created_at,
          updated_at: fav.order.updated_at,
          order_items: fav.order.order_items as OrderItem[]
        } : undefined
      })) || []);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchFavourites();
  }, [user]);

  const addFavouriteItem = async (menuItemId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favourite_items')
      .insert({ user_id: user.id, menu_item_id: menuItemId });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already in favourites' });
      } else {
        console.error('Error adding favourite item:', error);
        toast({ title: 'Failed to add to favourites', variant: 'destructive' });
      }
      return false;
    }

    toast({ title: 'Added to favourites' });
    fetchFavourites();
    return true;
  };

  const removeFavouriteItem = async (menuItemId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favourite_items')
      .delete()
      .eq('user_id', user.id)
      .eq('menu_item_id', menuItemId);

    if (error) {
      console.error('Error removing favourite item:', error);
      return false;
    }

    toast({ title: 'Removed from favourites' });
    fetchFavourites();
    return true;
  };

  const addFavouriteOrder = async (orderId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favourite_orders')
      .insert({ user_id: user.id, order_id: orderId });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already in favourites' });
      } else {
        console.error('Error adding favourite order:', error);
        toast({ title: 'Failed to add to favourites', variant: 'destructive' });
      }
      return false;
    }

    toast({ title: 'Order added to favourites' });
    fetchFavourites();
    return true;
  };

  const removeFavouriteOrder = async (orderId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('favourite_orders')
      .delete()
      .eq('user_id', user.id)
      .eq('order_id', orderId);

    if (error) {
      console.error('Error removing favourite order:', error);
      return false;
    }

    toast({ title: 'Removed from favourites' });
    fetchFavourites();
    return true;
  };

  const isItemFavourite = (menuItemId: string) => {
    return favouriteItems.some(f => f.menu_item_id === menuItemId);
  };

  const isOrderFavourite = (orderId: string) => {
    return favouriteOrders.some(f => f.order_id === orderId);
  };

  return {
    favouriteItems,
    favouriteOrders,
    isLoading,
    addFavouriteItem,
    removeFavouriteItem,
    addFavouriteOrder,
    removeFavouriteOrder,
    isItemFavourite,
    isOrderFavourite,
    refetch: fetchFavourites
  };
};
