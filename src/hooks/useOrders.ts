import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
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
  status: 'pending' | 'accepted' | 'rejected' | 'preparing' | 'ready' | 'completed';
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items?: OrderItem[];
  profile?: {
    full_name: string | null;
    email: string | null;
  };
}

export const useOrders = (filterByUser = true) => {
  const { user } = useUser();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrders = async () => {
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items (*)
      `)
      .order('created_at', { ascending: false });

    if (filterByUser && user) {
      query = query.eq('user_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
    } else {
      // Fetch profiles separately
      const userIds = [...new Set(data?.map(o => o.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      const mappedOrders: Order[] = (data || []).map(order => ({
        id: order.id,
        user_id: order.user_id,
        status: order.status as Order['status'],
        total: order.total,
        notes: order.notes,
        created_at: order.created_at,
        updated_at: order.updated_at,
        order_items: order.order_items as OrderItem[],
        profile: profileMap.get(order.user_id) ? {
          full_name: profileMap.get(order.user_id)?.full_name || null,
          email: profileMap.get(order.user_id)?.email || null
        } : undefined
      }));
      
      setOrders(mappedOrders);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Subscribe to realtime updates
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
            setOrders(prev => 
              prev.map(order => 
                order.id === payload.new.id 
                  ? { ...order, ...payload.new, status: payload.new.status as Order['status'] }
                  : order
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(order => order.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, filterByUser]);

  const updateOrderStatus = async (orderId: string, status: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);

    if (error) {
      console.error('Error updating order:', error);
      return false;
    }
    return true;
  };

  return { orders, isLoading, updateOrderStatus, refetch: fetchOrders };
};
