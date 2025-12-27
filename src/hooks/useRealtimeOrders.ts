import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RealtimeOrderHandlers {
  onNewOrder?: () => void;
  onOrderUpdate?: (orderId: string, newStatus: string) => void;
  onPaymentUpdate?: (orderId: string, paymentStatus: string, hasScreenshot: boolean) => void;
}

// Audio URLs for different notification types
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

export const useRealtimeOrders = (
  shopId: string | undefined,
  isShopkeeper: boolean,
  handlers: RealtimeOrderHandlers
) => {
  const { user } = useUser();
  const handlersRef = useRef(handlers);
  
  // Keep handlers ref updated
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!user?.id) return;

    const channelName = isShopkeeper 
      ? `orders-shop-${shopId}` 
      : `orders-user-${user.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          const newOrder = payload.new as any;
          
          // For shopkeeper: new order for their shop
          if (isShopkeeper && shopId && newOrder.shop_id === shopId) {
            console.log('🔔 New order for shop:', newOrder.id);
            playNotificationSound('newOrder');
            toast.success('🔔 New Order!', {
              description: 'A new order has been placed.',
              duration: 5000,
            });
            handlersRef.current.onNewOrder?.();
          }
          
          // For student: their new order confirmation
          if (!isShopkeeper && newOrder.user_id === user.id) {
            console.log('✅ Order created:', newOrder.id);
            handlersRef.current.onNewOrder?.();
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
          const updatedOrder = payload.new as any;
          const oldOrder = payload.old as any;
          
          // Check if this order is relevant
          const isRelevant = isShopkeeper 
            ? shopId && updatedOrder.shop_id === shopId
            : updatedOrder.user_id === user.id;
            
          if (!isRelevant) return;

          console.log('📝 Order updated:', updatedOrder.id, updatedOrder.status);

          // Status change notifications for student
          if (!isShopkeeper && oldOrder.status !== updatedOrder.status) {
            playNotificationSound('orderUpdate');
            const statusMessages: Record<string, string> = {
              accepted: '✅ Your order has been accepted!',
              rejected: '❌ Your order was rejected',
              preparing: '👨‍🍳 Your order is being prepared',
              ready: '🎉 Your order is ready for pickup!',
              completed: '✅ Order completed',
              cancelled: '❌ Order was cancelled'
            };
            const message = statusMessages[updatedOrder.status];
            if (message) {
              toast.info('Order Update', {
                description: message,
                duration: 5000,
              });
            }
          }

          // Payment screenshot uploaded - notify shopkeeper
          if (isShopkeeper && 
              !oldOrder.payment_screenshot_url && 
              updatedOrder.payment_screenshot_url) {
            playNotificationSound('payment');
            toast.success('💳 Payment Screenshot Submitted', {
              description: 'A customer has submitted payment proof. Please verify.',
              duration: 5000,
            });
          }

          // Payment verified - notify student
          if (!isShopkeeper && 
              oldOrder.payment_status === 'unpaid' && 
              updatedOrder.payment_status === 'paid') {
            playNotificationSound('payment');
            toast.success('✅ Payment Verified', {
              description: 'Your payment has been confirmed by the shop.',
              duration: 5000,
            });
          }

          handlersRef.current.onOrderUpdate?.(updatedOrder.id, updatedOrder.status);
          handlersRef.current.onPaymentUpdate?.(
            updatedOrder.id, 
            updatedOrder.payment_status,
            !!updatedOrder.payment_screenshot_url
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'orders',
        },
        () => {
          handlersRef.current.onNewOrder?.(); // Trigger refetch
        }
      )
      .subscribe((status) => {
        console.log(`Realtime orders channel (${channelName}) status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, shopId, isShopkeeper]);
};
