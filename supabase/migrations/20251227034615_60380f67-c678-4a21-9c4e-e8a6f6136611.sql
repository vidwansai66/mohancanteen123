-- Remove all SELECT policies on shops table first
DROP POLICY IF EXISTS "Shop owners can view their own shop" ON public.shops;
DROP POLICY IF EXISTS "Users can view shops for their orders" ON public.shops;

-- Create a single simple owner policy for SELECT
CREATE POLICY "Shop owners can view their own shop"
ON public.shops FOR SELECT
USING (owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Fix the shops_public view to use SECURITY INVOKER (not DEFINER)
DROP VIEW IF EXISTS public.shops_public;

CREATE VIEW public.shops_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  shop_name,
  is_open,
  reopen_time,
  created_at,
  is_active
FROM public.shops
WHERE is_active = true;

-- Grant SELECT on the public view
GRANT SELECT ON public.shops_public TO anon, authenticated;