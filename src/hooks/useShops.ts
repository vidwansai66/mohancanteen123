import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { supabase } from '@/integrations/supabase/client';

export interface Shop {
  id: string;
  owner_user_id: string;
  shop_name: string;
  upi_id: string | null;
  upi_name: string | null;
  is_open: boolean;
  is_active: boolean;
  reopen_time: string | null;
  created_at: string;
  updated_at: string;
}

export const useShops = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShops = async () => {
    // Shops are publicly readable for active ones, use regular client
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('is_active', true)
      .order('shop_name', { ascending: true });

    if (error) {
      console.error('Error fetching shops:', error);
    } else {
      setShops((data as Shop[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchShops();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('shops-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
        },
        () => {
          fetchShops();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { shops, isLoading, refetch: fetchShops };
};

export const useMyShop = () => {
  const { user } = useUser();
  const supabaseWithClerk = useSupabaseWithClerk();
  const [shop, setShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyShop = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabaseWithClerk
      .from('shops')
      .select('*')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching my shop:', error);
    } else {
      setShop(data as Shop | null);
    }
    setIsLoading(false);
  }, [user, supabaseWithClerk]);

  useEffect(() => {
    fetchMyShop();
  }, [fetchMyShop]);

  const createShop = async (shopName: string) => {
    if (!user) return null;

    const { data, error } = await supabaseWithClerk
      .from('shops')
      .insert({
        owner_user_id: user.id,
        shop_name: shopName,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating shop:', error);
      return null;
    }

    setShop(data as Shop);
    return data as Shop;
  };

  const updateShop = async (updates: Partial<Pick<Shop, 'shop_name' | 'upi_id' | 'upi_name' | 'is_open' | 'reopen_time' | 'is_active'>>) => {
    if (!shop) return false;

    const { data, error } = await supabaseWithClerk
      .from('shops')
      .update(updates)
      .eq('id', shop.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating shop:', error);
      return false;
    }

    setShop(data as Shop);
    return true;
  };

  const deactivateShop = async () => {
    if (!shop) return false;
    return updateShop({ is_active: false });
  };

  return { shop, isLoading, createShop, updateShop, deactivateShop, refetch: fetchMyShop };
};
