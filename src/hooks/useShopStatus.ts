import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ShopStatus {
  id: string;
  is_open: boolean;
  reopen_time: string | null;
}

export const useShopStatus = () => {
  const [shopStatus, setShopStatus] = useState<ShopStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      const { data, error } = await supabase
        .from('shop_status')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop status:', error);
      } else {
        setShopStatus(data);
      }
      setIsLoading(false);
    };

    fetchStatus();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('shop-status-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shop_status',
        },
        (payload) => {
          setShopStatus(payload.new as ShopStatus);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateShopStatus = async (isOpen: boolean, reopenTime?: Date | null) => {
    if (!shopStatus) return false;

    const { error } = await supabase
      .from('shop_status')
      .update({
        is_open: isOpen,
        reopen_time: reopenTime?.toISOString() || null,
      })
      .eq('id', shopStatus.id);

    if (error) {
      console.error('Error updating shop status:', error);
      return false;
    }
    return true;
  };

  return { shopStatus, isLoading, updateShopStatus };
};
