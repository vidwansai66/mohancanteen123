import { useState, useEffect, useCallback } from 'react';
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

    // Subscribe to realtime updates (realtime uses regular client)
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          console.log('💬 New message received:', payload);
          const newMsg = payload.new as OrderMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Play sound for new message
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
        }
      )
      .subscribe((status) => {
        console.log('Chat realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, fetchMessages]);

  const sendMessage = async (message: string, senderRole: 'student' | 'shopkeeper') => {
    if (!orderId || !user || !message.trim()) return false;

    const { error } = await supabaseWithClerk.from('order_messages').insert({
      order_id: orderId,
      sender_user_id: user.id,
      sender_role: senderRole,
      message: message.trim(),
    });

    if (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
      return false;
    }
    return true;
  };

  return { messages, isLoading, sendMessage, refetch: fetchMessages };
};
