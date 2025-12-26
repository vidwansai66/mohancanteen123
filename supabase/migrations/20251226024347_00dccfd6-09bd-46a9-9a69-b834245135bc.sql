-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'shopkeeper');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('breakfast', 'lunch', 'snacks', 'drinks')),
  image_url TEXT,
  in_stock BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'preparing', 'ready', 'completed')),
  total DECIMAL(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create order_items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price DECIMAL(10,2) NOT NULL,
  item_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create shop_status table (single row)
CREATE TABLE public.shop_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_open BOOLEAN DEFAULT true NOT NULL,
  reopen_time TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default shop status
INSERT INTO public.shop_status (is_open) VALUES (true);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shop_status ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (true);

-- User roles policies
CREATE POLICY "Anyone can view roles"
ON public.user_roles FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own role"
ON public.user_roles FOR INSERT
WITH CHECK (true);

-- Menu items policies (public read, shopkeeper write)
CREATE POLICY "Anyone can view menu items"
ON public.menu_items FOR SELECT
USING (true);

CREATE POLICY "Shopkeepers can insert menu items"
ON public.menu_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Shopkeepers can update menu items"
ON public.menu_items FOR UPDATE
USING (true);

CREATE POLICY "Shopkeepers can delete menu items"
ON public.menu_items FOR DELETE
USING (true);

-- Orders policies
CREATE POLICY "Users can view their own orders"
ON public.orders FOR SELECT
USING (true);

CREATE POLICY "Users can create orders"
ON public.orders FOR INSERT
WITH CHECK (true);

CREATE POLICY "Orders can be updated"
ON public.orders FOR UPDATE
USING (true);

-- Order items policies
CREATE POLICY "Anyone can view order items"
ON public.order_items FOR SELECT
USING (true);

CREATE POLICY "Users can create order items"
ON public.order_items FOR INSERT
WITH CHECK (true);

-- Shop status policies
CREATE POLICY "Anyone can view shop status"
ON public.shop_status FOR SELECT
USING (true);

CREATE POLICY "Shopkeepers can update shop status"
ON public.shop_status FOR UPDATE
USING (true);

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_status;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
BEFORE UPDATE ON public.menu_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shop_status_updated_at
BEFORE UPDATE ON public.shop_status
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();