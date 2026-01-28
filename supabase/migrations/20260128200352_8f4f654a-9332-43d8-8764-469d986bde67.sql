-- Fix 1: Remove the overly permissive notification insert policy
-- SECURITY DEFINER trigger functions (notify_new_message, notify_payment_update) bypass RLS,
-- so this policy is unnecessary and creates a security vulnerability
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Fix 2: Replace the shopkeeper profiles policy to exclude email address
-- Drop the existing policy that exposes email to shopkeepers
DROP POLICY IF EXISTS "Shopkeepers can view customer profiles" ON public.profiles;

-- Create a new policy that only allows viewing non-sensitive profile info
-- Shopkeepers should only see full_name and avatar_url, NOT email
CREATE POLICY "Shopkeepers can view customer profiles (limited)" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own profile
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Create a security definer function to get limited customer info for shopkeepers
CREATE OR REPLACE FUNCTION public.get_customer_profile_for_order(p_order_id uuid)
RETURNS TABLE(user_id text, full_name text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.full_name,
    p.avatar_url
  FROM public.profiles p
  INNER JOIN public.orders o ON o.user_id = p.user_id
  INNER JOIN public.shops s ON s.id = o.shop_id
  WHERE o.id = p_order_id
    AND s.owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text);
$$;