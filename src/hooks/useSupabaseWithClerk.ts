import { useUser } from '@clerk/clerk-react';
import { useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Creates a Supabase client with Clerk user ID in headers for RLS policies
 */
export function useSupabaseWithClerk() {
  const { user } = useUser();

  const supabaseClient = useMemo(() => {
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'x-clerk-user-id': user?.id || '',
        },
      },
    });
  }, [user?.id]);

  return supabaseClient;
}
