-- Create table for shopkeeper verification codes
CREATE TABLE public.shopkeeper_verification_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shopkeeper_verification_codes ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (edge function will handle this)
CREATE POLICY "Allow insert verification codes"
ON public.shopkeeper_verification_codes
FOR INSERT
WITH CHECK (true);

-- Allow users to read their own codes
CREATE POLICY "Users can view their own codes"
ON public.shopkeeper_verification_codes
FOR SELECT
USING (true);

-- Allow updating codes (to mark as used)
CREATE POLICY "Allow updating codes"
ON public.shopkeeper_verification_codes
FOR UPDATE
USING (true);