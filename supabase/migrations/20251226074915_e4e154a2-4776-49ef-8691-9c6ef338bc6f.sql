-- Function: delete old finished orders per user, keeping only the 10 most recent
CREATE OR REPLACE FUNCTION public.cleanup_old_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id text;
  v_cutoff_id uuid;
BEGIN
  -- Only run cleanup when an order transitions to a finished status
  IF NEW.status NOT IN ('completed', 'cancelled', 'rejected') THEN
    RETURN NEW;
  END IF;

  v_user_id := NEW.user_id;

  -- Find the 10th newest finished order for this user
  SELECT id INTO v_cutoff_id
  FROM public.orders
  WHERE user_id = v_user_id
    AND status IN ('completed', 'cancelled', 'rejected')
  ORDER BY created_at DESC
  OFFSET 10
  LIMIT 1;

  -- Delete all finished orders older than the 10th
  IF v_cutoff_id IS NOT NULL THEN
    DELETE FROM public.orders
    WHERE user_id = v_user_id
      AND status IN ('completed', 'cancelled', 'rejected')
      AND created_at < (SELECT created_at FROM public.orders WHERE id = v_cutoff_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger: run cleanup after each order status update
DROP TRIGGER IF EXISTS trg_cleanup_old_orders ON public.orders;
CREATE TRIGGER trg_cleanup_old_orders
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_old_orders();

-- Also add RLS policy so users can delete their own finished orders (for the trigger)
CREATE POLICY "Users can delete their own finished orders"
ON public.orders
FOR DELETE
USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id')
  AND status IN ('completed', 'cancelled', 'rejected')
);