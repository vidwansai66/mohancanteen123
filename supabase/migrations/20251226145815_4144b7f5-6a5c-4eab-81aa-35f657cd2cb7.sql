-- Drop conflicting policies and create a simple one that allows students to upload to payment-screenshots
DROP POLICY IF EXISTS "Anyone can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own payment screenshots" ON storage.objects;

-- Simple policy: anyone authenticated can upload to payment-screenshots bucket
CREATE POLICY "Authenticated users can upload payment screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'payment-screenshots' 
  AND ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id') IS NOT NULL
);