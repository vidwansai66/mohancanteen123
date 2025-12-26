-- Create shops table with UPI settings
CREATE TABLE public.shops (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  upi_id TEXT,
  upi_name TEXT,
  is_open BOOLEAN NOT NULL DEFAULT true,
  reopen_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add shop_id to menu_items
ALTER TABLE public.menu_items ADD COLUMN shop_id UUID REFERENCES public.shops(id) ON DELETE CASCADE;

-- Add shop_id to orders
ALTER TABLE public.orders ADD COLUMN shop_id UUID REFERENCES public.shops(id) ON DELETE SET NULL;

-- Enable RLS on shops
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- RLS policies for shops
CREATE POLICY "Anyone can view shops"
ON public.shops FOR SELECT
USING (true);

CREATE POLICY "Shopkeepers can create their shop"
ON public.shops FOR INSERT
WITH CHECK (true);

CREATE POLICY "Shopkeepers can update their own shop"
ON public.shops FOR UPDATE
USING (true);

-- Update trigger for shops
CREATE TRIGGER update_shops_updated_at
BEFORE UPDATE ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();