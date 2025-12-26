-- SECURITY: lock down shopkeeper verification codes so clients cannot read/modify them
-- (service role in backend functions bypasses RLS)
DROP POLICY IF EXISTS "Allow insert verification codes" ON public.shopkeeper_verification_codes;
DROP POLICY IF EXISTS "Users can view their own codes" ON public.shopkeeper_verification_codes;
DROP POLICY IF EXISTS "Allow updating codes" ON public.shopkeeper_verification_codes;