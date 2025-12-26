import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'student' | 'shopkeeper' | null;

export const useUserRole = () => {
  const { user, isLoaded } = useUser();
  const [role, setRole] = useState<UserRole>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!isLoaded) return;
      
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role:', error);
          setRole(null);
        } else {
          setRole(data?.role as UserRole || null);
        }
      } catch (error) {
        console.error('Error:', error);
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user, isLoaded]);

  const setUserRole = async (newRole: 'student' | 'shopkeeper') => {
    if (!user) return false;

    try {
      // First, ensure profile exists
      await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          full_name: user.fullName || user.firstName || '',
        }, { onConflict: 'user_id' });

      // Set the role
      const { error } = await supabase
        .from('user_roles')
        .upsert({
          user_id: user.id,
          role: newRole,
        }, { onConflict: 'user_id,role' });

      if (error) {
        console.error('Error setting role:', error);
        return false;
      }

      setRole(newRole);
      return true;
    } catch (error) {
      console.error('Error:', error);
      return false;
    }
  };

  return { role, isLoading, setUserRole, isLoaded };
};
