-- Fix: Protect UPI payment credentials from public access

-- Create a public view with only safe fields for browsing shops
CREATE OR REPLACE VIEW public.shops_public AS
SELECT 
  id,
  shop_name,
  is_open,
  reopen_time,
  created_at,
  is_active
  -- Excluded: owner_user_id, upi_id, upi_name (sensitive)
FROM public.shops
WHERE is_active = true;

-- Grant SELECT on the public view to all authenticated users
GRANT SELECT ON public.shops_public TO anon, authenticated;

-- Update the shops policy to only allow owners to see full details
-- First drop the existing permissive policy
DROP POLICY IF EXISTS "Anyone can view active shops" ON public.shops;

-- Create new policy: Only shop owners can SELECT from the shops table directly
CREATE POLICY "Shop owners can view their own shop"
ON public.shops FOR SELECT
USING (
  owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Students can view shops they have orders with (to see shop info in order details)
CREATE POLICY "Users can view shops for their orders"
ON public.shops FOR SELECT
USING (
  id IN (
    SELECT DISTINCT shop_id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  )
);