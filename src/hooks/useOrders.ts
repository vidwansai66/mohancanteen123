import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { useToast } from '@/hooks/use-toast';
import { toast as sonnerToast } from 'sonner';


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

// Audio URLs for notifications
const AUDIO_URLS = {
  newOrder: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  orderUpdate: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  payment: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

const playNotificationSound = (type: keyof typeof AUDIO_URLS) => {
  try {
    const audio = new Audio(AUDIO_URLS[type]);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

export const useOrders = (filterByUser = true, shopId?: string) => {
  const { user } = useUser();
  const supabaseWithClerk = useSupabaseWithClerk();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | undefined>();
  const shopIdRef = useRef<string | undefined>();
  
  // Keep refs updated
  useEffect(() => {
    userIdRef.current = user?.id;
    shopIdRef.current = shopId;
  }, [user?.id, shopId]);

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

    // Create unique channel name to avoid conflicts
    const channelName = `orders-realtime-${shopId || 'all'}-${filterByUser ? 'user' : 'shop'}-${user?.id || 'anon'}`;

    console.log('Orders realtime: subscribing with Clerk-aware client', {
      channelName,
      filterByUser,
      shopId: shopIdRef.current,
      userId: userIdRef.current,
    });

    // Subscribe to realtime updates (MUST use the Clerk-aware client so RLS works)
    const channel = supabaseWithClerk
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🔔 New order received:', payload);
          const newOrder = payload.new as any;

          // Check if this order is relevant using refs for latest values
          if (shopIdRef.current && newOrder.shop_id !== shopIdRef.current) return;
          if (filterByUser && userIdRef.current && newOrder.user_id !== userIdRef.current) return;

          fetchOrders();

          if (!filterByUser && shopIdRef.current) {
            // Shopkeeper: New order notification with sound
            playNotificationSound('newOrder');
            sonnerToast.success('🔔 New Order!', {
              description: 'A new order has been placed.',
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('📝 Order updated:', payload);
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;

          // Check if this order is relevant using refs
          if (shopIdRef.current && updatedOrder.shop_id !== shopIdRef.current) return;
          if (filterByUser && userIdRef.current && updatedOrder.user_id !== userIdRef.current) return;

          // Immediately update local state for faster UI response
          setOrders((prev) =>
            prev.map((order) =>
              order.id === updatedOrder.id
                ? {
                    ...order,
                    status: updatedOrder.status,
                    payment_status: updatedOrder.payment_status,
                    payment_verified: updatedOrder.payment_verified,
                    payment_screenshot_url: updatedOrder.payment_screenshot_url,
                    updated_at: updatedOrder.updated_at,
                  }
                : order
            )
          );

          // Student side: Show toast for status changes with sound
          if (filterByUser && oldOrder.status !== updatedOrder.status) {
            playNotificationSound('orderUpdate');
            const statusLabels: Record<string, string> = {
              accepted: '✅ Your order has been accepted!',
              rejected: '❌ Your order was rejected',
              preparing: '👨‍🍳 Your order is being prepared',
              ready: '🎉 Your order is ready for pickup!',
              completed: '✅ Order completed',
              cancelled: '❌ Order was cancelled',
            };
            const message = statusLabels[updatedOrder.status];
            if (message) {
              sonnerToast.info('Order Update', {
                description: message,
                duration: 5000,
              });
            }
          }

          // Student side: Payment verified notification
          if (
            filterByUser &&
            oldOrder.payment_status === 'unpaid' &&
            updatedOrder.payment_status === 'paid'
          ) {
            playNotificationSound('payment');
            sonnerToast.success('✅ Payment Verified', {
              description: 'Your payment has been confirmed by the shop.',
              duration: 5000,
            });
          }

          // Shopkeeper side: Payment screenshot submitted
          if (!filterByUser && !oldOrder.payment_screenshot_url && updatedOrder.payment_screenshot_url) {
            playNotificationSound('payment');
            sonnerToast.success('💳 Payment Screenshot Submitted', {
              description: 'A customer has submitted payment proof. Please verify.',
              duration: 5000,
            });
            // Refetch to get the new screenshot URL
            fetchOrders();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          console.log('🗑️ Order deleted:', payload);
          setOrders((prev) => prev.filter((order) => order.id !== (payload.old as any).id));
        }
      )
      .subscribe((status) => {
        console.log('Orders realtime subscription status:', status);
      });

    // Fallback polling to keep UI "live" even if realtime disconnects / is filtered
    const pollId = window.setInterval(() => {
      fetchOrders();
    }, 8000);

    return () => {
      window.clearInterval(pollId);
      supabaseWithClerk.removeChannel(channel);
    };
  }, [user?.id, filterByUser, shopId]);

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
