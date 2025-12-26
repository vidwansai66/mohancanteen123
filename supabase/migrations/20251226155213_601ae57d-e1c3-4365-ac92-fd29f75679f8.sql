-- Fix 1: Make payment-screenshots bucket private and add proper RLS

-- Make bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Order participants can view payment screenshots" ON storage.objects;

-- Users can only upload to their own folder (folder name = user_id)
CREATE POLICY "Users can upload own payment screenshots" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Only order participants can view (owner or shopkeeper)
CREATE POLICY "Order participants can view payment screenshots" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots'
  AND (
    -- Owner of the screenshot
    (storage.foldername(name))[1] = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR
    -- Shopkeeper for orders with this user's screenshots
    ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text) IN (
      SELECT s.owner_user_id FROM public.shops s
      INNER JOIN public.orders o ON o.shop_id = s.id
      WHERE o.user_id = (storage.foldername(name))[1]
    )
  )
);

-- Fix 2: Restrict user_roles to own role only

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view roles" ON public.user_roles;

-- Users can only view their own role
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);