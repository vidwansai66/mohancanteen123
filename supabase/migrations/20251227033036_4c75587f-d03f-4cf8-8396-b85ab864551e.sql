-- Fix 1: shop_status UPDATE policy - only allow shopkeepers
DROP POLICY IF EXISTS "Shopkeepers can update shop status" ON public.shop_status;

CREATE POLICY "Only shopkeepers can update shop status"
ON public.shop_status FOR UPDATE
USING (
  ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text) IN (
    SELECT user_id FROM public.user_roles WHERE role = 'shopkeeper'
  )
);

-- Fix 2: Create server-side order validation function
CREATE OR REPLACE FUNCTION public.create_validated_order(
  p_user_id TEXT,
  p_shop_id UUID,
  p_notes TEXT,
  p_items JSONB  -- [{menu_item_id: uuid, quantity: int}]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_item JSONB;
  v_menu_item RECORD;
  v_calculated_total NUMERIC := 0;
  v_current_user_id TEXT;
BEGIN
  -- Get current user from request headers
  v_current_user_id := (current_setting('request.headers', true)::json->>'x-clerk-user-id');
  
  -- Validate user matches the provided user_id
  IF v_current_user_id IS NULL OR v_current_user_id != p_user_id THEN
    RAISE EXCEPTION 'Unauthorized: user mismatch';
  END IF;
  
  -- Validate items array is not empty
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  
  -- Validate shop exists and is active
  IF NOT EXISTS (SELECT 1 FROM public.shops WHERE id = p_shop_id AND is_active = true) THEN
    RAISE EXCEPTION 'Shop not found or inactive';
  END IF;
  
  -- Create order (with 0 total initially)
  INSERT INTO public.orders (user_id, shop_id, notes, status, total)
  VALUES (p_user_id, p_shop_id, p_notes, 'pending', 0)
  RETURNING id INTO v_order_id;
  
  -- Process each item with price validation
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Validate quantity
    IF (v_item->>'quantity')::INTEGER < 1 OR (v_item->>'quantity')::INTEGER > 99 THEN
      RAISE EXCEPTION 'Invalid quantity for item';
    END IF;
    
    -- Get current menu item price from database
    SELECT * INTO v_menu_item 
    FROM public.menu_items 
    WHERE id = (v_item->>'menu_item_id')::UUID
      AND shop_id = p_shop_id
      AND in_stock = true;
    
    IF v_menu_item IS NULL THEN
      RAISE EXCEPTION 'Invalid or out of stock menu item: %', (v_item->>'menu_item_id');
    END IF;
    
    -- Insert order item with DATABASE price (not client price)
    INSERT INTO public.order_items (
      order_id,
      menu_item_id,
      quantity,
      price,  -- Use database price, not client price
      item_name
    ) VALUES (
      v_order_id,
      v_menu_item.id,
      (v_item->>'quantity')::INTEGER,
      v_menu_item.price,  -- VALIDATED from database
      v_menu_item.name
    );
    
    -- Add to calculated total
    v_calculated_total := v_calculated_total + 
      (v_menu_item.price * (v_item->>'quantity')::INTEGER);
  END LOOP;
  
  -- Update order with server-calculated total
  UPDATE public.orders 
  SET total = v_calculated_total 
  WHERE id = v_order_id;
  
  RETURN v_order_id;
END;
$$;