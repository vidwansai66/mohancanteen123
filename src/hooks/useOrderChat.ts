import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_user_id: string;
  sender_role: 'student' | 'shopkeeper';
  message: string;
  created_at: string;
}

export const useOrderChat = (orderId: string | null) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const userIdRef = useRef<string | undefined>(undefined);
  const orderIdRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  useEffect(() => {
    orderIdRef.current = orderId;
  }, [orderId]);

  const fetchMessages = useCallback(async (targetOrderId: string, userId: string) => {
    setIsLoading(true);
    
    // Use fetch with custom headers for RLS
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/order_messages?order_id=eq.${targetOrderId}&order=created_at.asc`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-clerk-user-id': userId,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      setMessages(data as OrderMessage[]);
    } else {
      console.error('Error fetching messages:', await response.text());
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!orderId) {
      setMessages([]);
      return;
    }

    if (user?.id) {
      fetchMessages(orderId, user.id);
    }

    // Use broadcast channel for instant message delivery
    const channelName = `chat-${orderId}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on('broadcast', { event: 'new-message' }, (payload) => {
        console.log('💬 Broadcast message received:', payload);
        const newMsg = payload.payload as OrderMessage;
        
        // Don't add if it's our own message (already added optimistically)
        if (newMsg.sender_user_id === userIdRef.current) return;
        
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // Play notification sound
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {
          // Ignore
        }
        
        toast.info('💬 New Message', {
          description: newMsg.message.slice(0, 50) + (newMsg.message.length > 50 ? '...' : ''),
        });
      })
      .subscribe((status) => {
        console.log(`Chat broadcast channel ${channelName} status:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orderId, user?.id, fetchMessages]);

  const sendMessage = useCallback(async (message: string, senderRole: 'student' | 'shopkeeper') => {
    const currentOrderId = orderIdRef.current;
    const currentUserId = userIdRef.current;
    
    if (!currentOrderId || !currentUserId || !message.trim()) return false;

    const tempId = crypto.randomUUID();
    const newMessage: OrderMessage = {
      id: tempId,
      order_id: currentOrderId,
      sender_user_id: currentUserId,
      sender_role: senderRole,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistically add message
    setMessages((prev) => [...prev, newMessage]);

    // Insert via REST API with custom headers
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/order_messages`,
      {
        method: 'POST',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          'x-clerk-user-id': currentUserId,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          order_id: currentOrderId,
          sender_user_id: currentUserId,
          sender_role: senderRole,
          message: message.trim(),
        }),
      }
    );

    if (!response.ok) {
      console.error('Error sending message:', await response.text());
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send message');
      return false;
    }

    const [data] = await response.json();

    // Update with real message data
    setMessages((prev) => prev.map(m => m.id === tempId ? (data as OrderMessage) : m));

    // Broadcast to other clients
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: data as OrderMessage,
      });
      console.log('📤 Message broadcasted:', data);
    }

    return true;
  }, []);

  const refetch = useCallback(() => {
    if (orderIdRef.current && userIdRef.current) {
      fetchMessages(orderIdRef.current, userIdRef.current);
    }
  }, [fetchMessages]);

  return { messages, isLoading, sendMessage, refetch };
};
