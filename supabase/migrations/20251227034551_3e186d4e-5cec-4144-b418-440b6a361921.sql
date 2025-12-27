-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view shops for their orders" ON public.shops;

-- Keep only the owner policy - shopkeepers can see their own shop
-- The owner policy already exists: "Shop owners can view their own shop"