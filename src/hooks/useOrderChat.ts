import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const supabaseWithClerk = useSupabaseWithClerk();
  const { toast } = useToast();
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    const { data, error } = await supabaseWithClerk
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data as OrderMessage[]);
    }
    setIsLoading(false);
  }, [orderId, supabaseWithClerk]);

  useEffect(() => {
    if (!orderId) {
      setMessages([]);
      return;
    }

    fetchMessages();

    // Use broadcast channel for instant message delivery (bypasses RLS filtering on realtime)
    const channelName = `chat-${orderId}`;
    const channel = supabase.channel(channelName);
    
    channel
      .on('broadcast', { event: 'new-message' }, (payload) => {
        console.log('💬 Broadcast message received:', payload);
        const newMsg = payload.payload as OrderMessage;
        
        // Don't add if it's our own message (already added optimistically)
        if (newMsg.sender_user_id === user?.id) return;
        
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        
        // Play notification sound for incoming message
        try {
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
          audio.volume = 0.3;
          audio.play().catch(() => {});
        } catch (e) {}
        
        // Show toast notification
        toast({
          title: '💬 New Message',
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
  }, [orderId, user?.id, toast]);

  // Re-fetch when orderId changes
  useEffect(() => {
    if (orderId) {
      fetchMessages();
    }
  }, [orderId, fetchMessages]);

  const sendMessage = async (message: string, senderRole: 'student' | 'shopkeeper') => {
    if (!orderId || !user || !message.trim()) return false;

    const tempId = crypto.randomUUID();
    const newMessage: OrderMessage = {
      id: tempId,
      order_id: orderId,
      sender_user_id: user.id,
      sender_role: senderRole,
      message: message.trim(),
      created_at: new Date().toISOString(),
    };

    // Optimistically add message to UI immediately
    setMessages((prev) => [...prev, newMessage]);

    const { data, error } = await supabaseWithClerk.from('order_messages').insert({
      order_id: orderId,
      sender_user_id: user.id,
      sender_role: senderRole,
      message: message.trim(),
    }).select().single();

    if (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => m.id !== tempId));
      toast({ title: 'Failed to send message', variant: 'destructive' });
      return false;
    }

    // Update with real message data
    setMessages((prev) => prev.map(m => m.id === tempId ? (data as OrderMessage) : m));

    // Broadcast the message to other clients
    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'new-message',
        payload: data as OrderMessage,
      });
      console.log('📤 Message broadcasted:', data);
    }

    return true;
  };

  return { messages, isLoading, sendMessage, refetch: fetchMessages };
};
