import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface OrderItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  price: number;
  item_name: string;
}

export interface Order {
  id: string;
  user_id: string;
  shop_id: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'preparing' | 'ready' | 'completed';
  payment_status: 'unpaid' | 'paid';
  total: number;
  notes: string | null;
  utr_number: string | null;
  payment_screenshot_url: string | null;
  payment_verified: boolean | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profile?: {
    full_name: string | null;
    email: string | null;
  };
  shop?: {
    shop_name: string;
    upi_id: string | null;
    upi_name: string | null;
  };
}

export const useOrders = (filterByUser = true, shopId?: string) => {
  const { user } = useUser();
  const supabaseWithClerk = useSupabaseWithClerk();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let query = supabaseWithClerk
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (filterByUser) {
      query = query.eq('user_id', user.id);
    }

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      // Fetch profiles separately
      const userIds = [...new Set(data?.map(o => o.user_id) || [])];
      const { data: profiles } = await supabaseWithClerk
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Fetch shops separately (shops are publicly readable for active ones)
      const shopIds = [...new Set(data?.map(o => o.shop_id).filter(Boolean) || [])] as string[];
      let shopMap = new Map<string, { id: string; shop_name: string; upi_id: string | null; upi_name: string | null }>();
      
      if (shopIds.length > 0) {
        const { data: shops } = await supabaseWithClerk
          .from('shops')
          .select('id, shop_name, upi_id, upi_name')
          .in('id', shopIds);
        
        shopMap = new Map((shops || []).map(s => [s.id, s]));
      }

      const mappedOrders: Order[] = (data || []).map(order => ({
        id: order.id,
        user_id: order.user_id,
        shop_id: order.shop_id,
        status: order.status as Order['status'],
        payment_status: (order.payment_status || 'unpaid') as Order['payment_status'],
        total: order.total,
        notes: order.notes,
        utr_number: order.utr_number,
        payment_screenshot_url: order.payment_screenshot_url,
        payment_verified: order.payment_verified,
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items: order.order_items as OrderItem[],
        profile: profileMap.get(order.user_id) ? {
          full_name: profileMap.get(order.user_id)?.full_name || null,
          email: profileMap.get(order.user_id)?.email || null
        } : undefined,
        shop: order.shop_id && shopMap.get(order.shop_id) ? {
          shop_name: shopMap.get(order.shop_id)?.shop_name || '',
          upi_id: shopMap.get(order.shop_id)?.upi_id || null,
          upi_name: shopMap.get(order.shop_id)?.upi_name || null
        } : undefined
      }));
      
      setOrders(mappedOrders);
    }
    setIsLoading(false);
  }, [user, supabaseWithClerk, filterByUser, shopId]);

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates (use regular client for realtime - it's a separate channel)
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // New order - refetch to get order items
            fetchOrders();
            if (!filterByUser) {
              toast({
                title: '🔔 New Order!',
                description: 'A new order has been placed.',
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Refetch to get the latest data including utr_number and payment_screenshot_url
            fetchOrders();
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders, filterByUser, toast]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const { error } = await supabaseWithClerk
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      toast({ title: 'Failed to update order', description: error.message, variant: 'destructive' });
      return false;
    }
    // Refetch to ensure local state is updated
    await fetchOrders();
    return true;
  };

  const cancelPendingOrder = async (orderId: string) => {
    const { data, error } = await supabaseWithClerk
      .from('orders')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .eq('status', 'pending')
      .select('id');

    if (error) {
      console.error('Error cancelling order:', error);
      toast({ title: 'Cancel failed', description: error.message, variant: 'destructive' });
      return false;
    }

    if (!data || data.length === 0) {
      toast({
        title: 'Cannot cancel this order',
        description: 'This order was already accepted or updated by the shopkeeper.',
        variant: 'destructive',
      });
      await fetchOrders();
      return false;
    }

    await fetchOrders();
    return true;
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: Order['payment_status']) => {
    const { error } = await supabaseWithClerk
      .from('orders')
      .update({ payment_status: paymentStatus })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating payment status:', error);
      return false;
    }
    return true;
  };

  return { orders, isLoading, updateOrderStatus, cancelPendingOrder, updatePaymentStatus, refetch: fetchOrders };
};
