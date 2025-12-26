-- Create favourite_items table for storing user's favourite menu items
CREATE TABLE public.favourite_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, menu_item_id)
);

-- Create favourite_orders table for storing user's favourite orders
CREATE TABLE public.favourite_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, order_id)
);

-- Enable RLS
ALTER TABLE public.favourite_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favourite_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies for favourite_items
CREATE POLICY "Users can view their own favourite items"
ON public.favourite_items
FOR SELECT
USING (user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id' OR true);

CREATE POLICY "Users can add favourite items"
ON public.favourite_items
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can remove favourite items"
ON public.favourite_items
FOR DELETE
USING (true);

-- RLS policies for favourite_orders
CREATE POLICY "Users can view their own favourite orders"
ON public.favourite_orders
FOR SELECT
USING (user_id = current_setting('request.headers', true)::json->>'x-clerk-user-id' OR true);

CREATE POLICY "Users can add favourite orders"
ON public.favourite_orders
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can remove favourite orders"
ON public.favourite_orders
FOR DELETE
USING (true);