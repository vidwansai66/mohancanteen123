-- Add explicit deny-all policies to satisfy RLS linter while keeping table locked down
CREATE POLICY "Deny select verification codes"
ON public.shopkeeper_verification_codes
FOR SELECT
USING (false);

CREATE POLICY "Deny insert verification codes"
ON public.shopkeeper_verification_codes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "Deny update verification codes"
ON public.shopkeeper_verification_codes
FOR UPDATE
USING (false);

CREATE POLICY "Deny delete verification codes"
ON public.shopkeeper_verification_codes
FOR DELETE
USING (false);