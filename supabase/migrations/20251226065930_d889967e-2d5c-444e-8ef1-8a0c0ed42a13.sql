-- Fix profiles RLS policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
FOR INSERT WITH CHECK (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Fix user_roles RLS policies (critical for authorization)
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;
CREATE POLICY "Users can insert their own role" ON public.user_roles
FOR INSERT WITH CHECK (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Fix shops RLS policies
DROP POLICY IF EXISTS "Shopkeepers can create their shop" ON public.shops;
CREATE POLICY "Shopkeepers can create their shop" ON public.shops
FOR INSERT WITH CHECK (
  owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

DROP POLICY IF EXISTS "Shopkeepers can update their own shop" ON public.shops;
CREATE POLICY "Shopkeepers can update their own shop" ON public.shops
FOR UPDATE USING (
  owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Fix orders RLS policies - restrict to order owner and shop owner
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  OR ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text) IN (
    SELECT owner_user_id FROM public.shops WHERE id = shop_id
  )
);

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
FOR INSERT WITH CHECK (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

DROP POLICY IF EXISTS "Orders can be updated" ON public.orders;
CREATE POLICY "Orders can be updated" ON public.orders
FOR UPDATE USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  OR ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text) IN (
    SELECT owner_user_id FROM public.shops WHERE id = shop_id
  )
);

-- Fix menu_items RLS policies - restrict to shop owner
DROP POLICY IF EXISTS "Shopkeepers can insert menu items" ON public.menu_items;
CREATE POLICY "Shopkeepers can insert menu items" ON public.menu_items
FOR INSERT WITH CHECK (
  shop_id IN (
    SELECT id FROM public.shops 
    WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  )
);

DROP POLICY IF EXISTS "Shopkeepers can update menu items" ON public.menu_items;
CREATE POLICY "Shopkeepers can update menu items" ON public.menu_items
FOR UPDATE USING (
  shop_id IN (
    SELECT id FROM public.shops 
    WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  )
);

DROP POLICY IF EXISTS "Shopkeepers can delete menu items" ON public.menu_items;
CREATE POLICY "Shopkeepers can delete menu items" ON public.menu_items
FOR DELETE USING (
  shop_id IN (
    SELECT id FROM public.shops 
    WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  )
);

-- Fix order_items RLS policies - restrict to order participants
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
FOR SELECT USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR shop_id IN (
      SELECT id FROM public.shops 
      WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);

DROP POLICY IF EXISTS "Users can create order items" ON public.order_items;
CREATE POLICY "Users can create order items" ON public.order_items
FOR INSERT WITH CHECK (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  )
);

-- Fix order_messages RLS policies - restrict to order participants
DROP POLICY IF EXISTS "Users can view order messages" ON public.order_messages;
CREATE POLICY "Users can view order messages" ON public.order_messages
FOR SELECT USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR shop_id IN (
      SELECT id FROM public.shops 
      WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);

DROP POLICY IF EXISTS "Users can send order messages" ON public.order_messages;
CREATE POLICY "Users can send order messages" ON public.order_messages
FOR INSERT WITH CHECK (
  sender_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
  AND order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR shop_id IN (
      SELECT id FROM public.shops 
      WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);

DROP POLICY IF EXISTS "Users can mark messages as read" ON public.order_messages;
CREATE POLICY "Users can mark messages as read" ON public.order_messages
FOR UPDATE USING (
  order_id IN (
    SELECT id FROM public.orders 
    WHERE user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    OR shop_id IN (
      SELECT id FROM public.shops 
      WHERE owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);

-- Fix favourite_items RLS policies
DROP POLICY IF EXISTS "Users can add favourite items" ON public.favourite_items;
CREATE POLICY "Users can add favourite items" ON public.favourite_items
FOR INSERT WITH CHECK (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

DROP POLICY IF EXISTS "Users can remove favourite items" ON public.favourite_items;
CREATE POLICY "Users can remove favourite items" ON public.favourite_items
FOR DELETE USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

-- Fix favourite_orders RLS policies
DROP POLICY IF EXISTS "Users can add favourite orders" ON public.favourite_orders;
CREATE POLICY "Users can add favourite orders" ON public.favourite_orders
FOR INSERT WITH CHECK (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);

DROP POLICY IF EXISTS "Users can remove favourite orders" ON public.favourite_orders;
CREATE POLICY "Users can remove favourite orders" ON public.favourite_orders
FOR DELETE USING (
  user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
);