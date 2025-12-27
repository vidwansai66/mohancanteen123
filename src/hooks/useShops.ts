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

// Public shop info (without sensitive data like UPI)
export interface PublicShop {
  id: string;
  shop_name: string;
  is_open: boolean;
  is_active: boolean;
  reopen_time: string | null;
  created_at: string;
}

export const useShops = () => {
  const [shops, setShops] = useState<PublicShop[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchShops = async () => {
    // Use the security definer function to get public shop data
    const { data, error } = await supabase.rpc('get_public_shops');

    if (error) {
      console.error('Error fetching shops:', error);
    } else {
      setShops((data as PublicShop[]) || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchShops();

    // Subscribe to realtime updates for all shops (via the base table)
    const channel = supabase
      .channel('shops-realtime-all')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shops',
        },
        (payload) => {
          console.log('🏪 Shops changed:', payload.eventType, payload);
          
          if (payload.eventType === 'INSERT') {
            const newShop = payload.new as any;
            if (newShop.is_active) {
              const publicShop: PublicShop = {
                id: newShop.id,
                shop_name: newShop.shop_name,
                is_open: newShop.is_open,
                is_active: newShop.is_active,
                reopen_time: newShop.reopen_time,
                created_at: newShop.created_at,
              };
              setShops(prev => [...prev, publicShop].sort((a, b) => a.shop_name.localeCompare(b.shop_name)));
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedShop = payload.new as any;
            setShops(prev => {
              if (updatedShop.is_active) {
                const publicShop: PublicShop = {
                  id: updatedShop.id,
                  shop_name: updatedShop.shop_name,
                  is_open: updatedShop.is_open,
                  is_active: updatedShop.is_active,
                  reopen_time: updatedShop.reopen_time,
                  created_at: updatedShop.created_at,
                };
                const exists = prev.some(s => s.id === updatedShop.id);
                if (exists) {
                  return prev.map(s => s.id === updatedShop.id ? publicShop : s);
                } else {
                  return [...prev, publicShop].sort((a, b) => a.shop_name.localeCompare(b.shop_name));
                }
              } else {
                return prev.filter(s => s.id !== updatedShop.id);
              }
            });
          } else if (payload.eventType === 'DELETE') {
            const deletedShop = payload.old as any;
            setShops(prev => prev.filter(s => s.id !== deletedShop.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('All shops realtime subscription status:', status);
      });

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
    
    // Subscribe to realtime updates for my shop
    if (!user?.id) return;
    
    const channel = supabase
      .channel(`my-shop-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shops',
        },
        (payload) => {
          const updatedShop = payload.new as any;
          if (updatedShop.owner_user_id === user.id) {
            console.log('🏪 My shop updated:', payload);
            setShop(updatedShop as Shop);
          }
        }
      )
      .subscribe((status) => {
        console.log('My shop realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

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
