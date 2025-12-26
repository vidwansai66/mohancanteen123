-- Add is_active column to shops table (defaults to true)
ALTER TABLE public.shops ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Update RLS policy to only show active shops to students
DROP POLICY IF EXISTS "Anyone can view shops" ON public.shops;
CREATE POLICY "Anyone can view active shops" ON public.shops
FOR SELECT
USING (is_active = true OR owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));