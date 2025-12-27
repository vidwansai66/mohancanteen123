import { useEffect, useRef } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NotificationHandlers {
  onNewNotification?: (notification: any) => void;
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

export const useRealtimeNotifications = (handlers?: NotificationHandlers) => {
  const { user } = useUser();
  const handlersRef = useRef(handlers);

  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const notification = payload.new as any;
          console.log('🔔 New notification:', notification);
          
          // Play sound for all notifications
          playNotificationSound();
          
          // Show toast based on notification type
          const toastOptions = {
            description: notification.message,
            duration: 5000,
          };
          
          if (notification.type === 'chat') {
            toast.info(`💬 ${notification.title}`, toastOptions);
          } else if (notification.type === 'payment') {
            toast.success(`💳 ${notification.title}`, toastOptions);
          } else {
            toast.info(`🔔 ${notification.title}`, toastOptions);
          }
          
          handlersRef.current?.onNewNotification?.(notification);
        }
      )
      .subscribe((status) => {
        console.log(`Notifications realtime channel status:`, status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
};
