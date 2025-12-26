import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { supabase } from '@/integrations/supabase/client';

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: 'breakfast' | 'lunch' | 'snacks' | 'drinks';
  image_url: string | null;
  in_stock: boolean;
  shop_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useMenuItems = (shopId?: string) => {
  const supabaseWithClerk = useSupabaseWithClerk();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMenuItems = useCallback(async () => {
    // Menu items are publicly readable, but we use the clerk client for consistency
    let query = supabase
      .from('menu_items')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (shopId) {
      query = query.eq('shop_id', shopId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching menu items:', error);
    } else {
      setMenuItems((data as MenuItem[]) || []);
    }
    setIsLoading(false);
  }, [shopId]);

  useEffect(() => {
    fetchMenuItems();
    
    // Subscribe to realtime updates for menu items
    const channelName = `menu-items-realtime-${shopId || 'all'}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'menu_items',
        },
        (payload) => {
          console.log('🍔 Menu item change:', payload.eventType, payload);
          const changedItem = (payload.new || payload.old) as any;
          
          // Filter by shopId if specified
          if (shopId && changedItem?.shop_id !== shopId) return;
          
          if (payload.eventType === 'INSERT') {
            setMenuItems(prev => [...prev, changedItem as MenuItem]);
          } else if (payload.eventType === 'UPDATE') {
            setMenuItems(prev => prev.map(item => 
              item.id === changedItem.id ? changedItem as MenuItem : item
            ));
          } else if (payload.eventType === 'DELETE') {
            setMenuItems(prev => prev.filter(item => item.id !== changedItem.id));
          }
        }
      )
      .subscribe((status) => {
        console.log('Menu items realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);

  const addMenuItem = async (item: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabaseWithClerk
      .from('menu_items')
      .insert(item)
      .select()
      .single();

    if (error) {
      console.error('Error adding menu item:', error);
      return null;
    }
    
    setMenuItems(prev => [...prev, data as MenuItem]);
    return data as MenuItem;
  };

  const updateMenuItem = async (id: string, updates: Partial<MenuItem>) => {
    const { data, error } = await supabaseWithClerk
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating menu item:', error);
      return null;
    }
    
    setMenuItems(prev => prev.map(item => item.id === id ? (data as MenuItem) : item));
    return data as MenuItem;
  };

  const deleteMenuItem = async (id: string) => {
    const { error } = await supabaseWithClerk
      .from('menu_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting menu item:', error);
      return false;
    }
    
    setMenuItems(prev => prev.filter(item => item.id !== id));
    return true;
  };

  const toggleStock = async (id: string, inStock: boolean) => {
    return updateMenuItem(id, { in_stock: inStock });
  };

  return { 
    menuItems, 
    isLoading, 
    addMenuItem, 
    updateMenuItem, 
    deleteMenuItem, 
    toggleStock,
    refetch: fetchMenuItems 
  };
};
