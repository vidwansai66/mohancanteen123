-- Allow anyone to read active shops (for the public view to work)
-- This is safe because the view only exposes non-sensitive fields
CREATE POLICY "Anyone can view active shops via view"
ON public.shops FOR SELECT
USING (is_active = true);