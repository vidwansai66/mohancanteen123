-- Task 1: Fix mark_messages_as_read authorization bypass
-- Replace the function with proper authorization checks

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_order_id uuid, p_reader_role text)
RETURNS void AS $$
DECLARE
  v_current_user_id TEXT;
  v_order_user_id TEXT;
  v_shop_owner_id TEXT;
  v_is_authorized BOOLEAN := false;
BEGIN
  -- Get current user from request headers
  v_current_user_id := (current_setting('request.headers', true)::json->>'x-clerk-user-id');
  
  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Validate reader_role parameter
  IF p_reader_role NOT IN ('student', 'shopkeeper') THEN
    RAISE EXCEPTION 'Invalid reader role';
  END IF;
  
  -- Get order details
  SELECT user_id INTO v_order_user_id 
  FROM public.orders 
  WHERE id = p_order_id;
  
  IF v_order_user_id IS NULL THEN
    RAISE EXCEPTION 'Order not found';
  END IF;
  
  -- Get shop owner for this order
  SELECT s.owner_user_id INTO v_shop_owner_id 
  FROM public.shops s 
  INNER JOIN public.orders o ON o.shop_id = s.id 
  WHERE o.id = p_order_id;
  
  -- Verify caller is authorized and role matches
  IF p_reader_role = 'student' AND v_current_user_id = v_order_user_id THEN
    v_is_authorized := true;
  ELSIF p_reader_role = 'shopkeeper' AND v_current_user_id = v_shop_owner_id THEN
    v_is_authorized := true;
  END IF;
  
  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'Not authorized to mark messages as read for this order';
  END IF;
  
  -- Mark messages as read
  UPDATE public.order_messages
  SET is_read = true
  WHERE order_id = p_order_id
    AND sender_role != p_reader_role
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Task 2: Fix overly permissive UPDATE policy on order_messages
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.order_messages;

CREATE POLICY "Users can mark messages as read via function" 
ON public.order_messages 
FOR UPDATE 
USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR shop_id IN (
      SELECT id FROM public.shops 
      WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);

-- Task 3: Tighten storage RLS policies for payment-screenshots
DROP POLICY IF EXISTS "Authenticated users can upload payment screenshots" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view payment screenshots" ON storage.objects;

-- Users can only upload to their own folder
CREATE POLICY "Users can upload own payment screenshots" ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'payment-screenshots'
  AND (storage.foldername(name))[1] = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Order participants can view payment screenshots
CREATE POLICY "Order participants can view payment screenshots" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'payment-screenshots'
  AND (
    -- Owner of the payment screenshot
    (storage.foldername(name))[1] = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR
    -- Shopkeeper for orders with this user's screenshots
    ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text) IN (
      SELECT owner_user_id FROM public.shops s
      INNER JOIN public.orders o ON o.shop_id = s.id
      WHERE o.user_id = (storage.foldername(name))[1]
    )
  )
);

-- Task 4: Add database CHECK constraints for text length limits
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS notes_length;
ALTER TABLE public.orders ADD CONSTRAINT notes_length CHECK (length(notes) <= 1000);

ALTER TABLE public.order_messages DROP CONSTRAINT IF EXISTS message_length;
ALTER TABLE public.order_messages ADD CONSTRAINT message_length CHECK (length(message) <= 500);

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS name_length;
ALTER TABLE public.menu_items ADD CONSTRAINT name_length CHECK (length(name) <= 100);

ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS description_length;
ALTER TABLE public.menu_items ADD CONSTRAINT description_length CHECK (length(description) <= 500);

ALTER TABLE public.shops DROP CONSTRAINT IF EXISTS shop_name_length;
ALTER TABLE public.shops ADD CONSTRAINT shop_name_length CHECK (length(shop_name) <= 100);

-- Task 5: Add order expiry validation trigger (prevent accepting expired orders)
CREATE OR REPLACE FUNCTION validate_order_not_expired()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('accepted', 'preparing') 
     AND OLD.status = 'pending' 
     AND OLD.created_at < now() - INTERVAL '5 hours' THEN
    RAISE EXCEPTION 'Cannot accept order: order has expired (pending > 5 hours)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_order_expiry ON public.orders;
CREATE TRIGGER check_order_expiry
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION validate_order_not_expired();

-- Task 6: Create function to auto-cancel old pending orders (for manual/scheduled execution)
CREATE OR REPLACE FUNCTION public.cancel_old_pending_orders()
RETURNS TABLE(cancelled_count integer, order_ids uuid[]) AS $$
DECLARE
  v_cancelled_ids uuid[];
  v_count integer;
BEGIN
  -- Cancel orders and collect IDs
  WITH cancelled AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status = 'pending'
    AND created_at < now() - INTERVAL '5 hours'
    RETURNING id, user_id
  )
  SELECT array_agg(id), COALESCE(count(*)::integer, 0)
  INTO v_cancelled_ids, v_count 
  FROM cancelled;
  
  -- Create notifications for affected users
  IF v_count > 0 AND v_cancelled_ids IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT DISTINCT o.user_id,
           'Order Auto-Cancelled',
           'Your pending order was automatically cancelled after 5 hours',
           'order'
    FROM public.orders o
    WHERE o.id = ANY(v_cancelled_ids);
  END IF;
  
  RETURN QUERY SELECT COALESCE(v_count, 0), v_cancelled_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;