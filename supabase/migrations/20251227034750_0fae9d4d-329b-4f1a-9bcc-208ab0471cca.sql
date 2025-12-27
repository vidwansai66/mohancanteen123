-- Remove the overly permissive policy - it exposes UPI data
DROP POLICY IF EXISTS "Anyone can view active shops via view" ON public.shops;

-- Instead, create a security definer function to safely return public shop data
CREATE OR REPLACE FUNCTION public.get_public_shops()
RETURNS TABLE (
  id uuid,
  shop_name text,
  is_open boolean,
  is_active boolean,
  reopen_time timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    shop_name,
    is_open,
    is_active,
    reopen_time,
    created_at
  FROM public.shops
  WHERE is_active = true
  ORDER BY shop_name;
$$;

-- Grant execute to all
GRANT EXECUTE ON FUNCTION public.get_public_shops() TO anon, authenticated;

-- Drop the view since we're using the function instead
DROP VIEW IF EXISTS public.shops_public;