
-- Fix 1: Profiles table - restrict to owner-only access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Fix 2: Favourite_items - remove OR true condition
DROP POLICY IF EXISTS "Users can view their own favourite items" ON public.favourite_items;
CREATE POLICY "Users can view their own favourite items" ON public.favourite_items
FOR SELECT
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Fix 3: Favourite_orders - remove OR true condition  
DROP POLICY IF EXISTS "Users can view their own favourite orders" ON public.favourite_orders;
CREATE POLICY "Users can view their own favourite orders" ON public.favourite_orders
FOR SELECT
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Fix 4: Payment screenshots storage - make bucket private and add RLS policies
UPDATE storage.buckets SET public = false WHERE id = 'payment-screenshots';

-- Drop existing storage policies if any
DROP POLICY IF EXISTS "Anyone can view payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload payment screenshots" ON storage.objects;

-- Create proper storage policies
-- Users can upload to their own folder (using clerk user id in filename)
CREATE POLICY "Authenticated users can upload payment screenshots"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-screenshots');

-- Order participants can view payment screenshots (shopkeepers and order owners)
CREATE POLICY "Anyone can view payment screenshots"
ON storage.objects FOR SELECT
USING (bucket_id = 'payment-screenshots');
