import { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { toast as sonnerToast } from 'sonner';


export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  order_id: string | null;
  created_at: string;
}

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3';

const playNotificationSound = () => {
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch (e) {
    // Ignore audio errors
  }
};

export const useNotifications = () => {
  const { user } = useUser();
  const supabaseWithClerk = useSupabaseWithClerk();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | undefined>();
  
  // Keep ref updated
  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user?.id]);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabaseWithClerk
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
    } else {
      setNotifications((data as Notification[]) || []);
      setUnreadCount((data as Notification[])?.filter(n => !n.is_read).length || 0);
    }
    setIsLoading(false);
  }, [user?.id, supabaseWithClerk]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Subscribe to realtime notifications with audio alerts
  useEffect(() => {
    if (!user?.id) return;

    console.log('Notifications realtime: subscribing with Clerk-aware client', {
      channelName: `notifications-realtime-${user.id}`,
      userId: user.id,
    });

    const channel = supabaseWithClerk
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          console.log('🔔 New notification received:', newNotification);

          // Play notification sound
          playNotificationSound();

          // Update state
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);

          // Show toast based on notification type
          const toastOptions = {
            description: newNotification.message,
            duration: 5000,
          };

          if (newNotification.type === 'chat') {
            sonnerToast.info(`💬 ${newNotification.title}`, toastOptions);
          } else if (newNotification.type === 'payment') {
            sonnerToast.success(`💳 ${newNotification.title}`, toastOptions);
          } else {
            sonnerToast.info(`🔔 ${newNotification.title}`, toastOptions);
          }
        }
      )
      .subscribe((status) => {
        console.log('Notifications realtime subscription status:', status);
      });

    // Fallback polling to keep notifications fresh
    const pollId = window.setInterval(() => {
      fetchNotifications();
    }, 15000);

    return () => {
      window.clearInterval(pollId);
      supabaseWithClerk.removeChannel(channel);
    };
  }, [user?.id, supabaseWithClerk, fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabaseWithClerk
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    const { error } = await supabaseWithClerk
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    const { error } = await supabaseWithClerk
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications
  };
};
