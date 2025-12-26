-- Enable full replica identity for complete row data on updates
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.order_messages REPLICA IDENTITY FULL;

-- Allow shopkeepers to view customer profiles for their orders
CREATE POLICY "Shopkeepers can view customer profiles" 
ON public.profiles 
FOR SELECT 
USING (
  user_id IN (
    SELECT DISTINCT orders.user_id 
    FROM orders 
    WHERE orders.shop_id IN (
      SELECT shops.id 
      FROM shops 
      WHERE shops.owner_user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text)
    )
  )
);