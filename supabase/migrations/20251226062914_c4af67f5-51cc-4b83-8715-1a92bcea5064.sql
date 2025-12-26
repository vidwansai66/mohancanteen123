
-- Fix menu_items deletion by changing order_items foreign key to SET NULL on delete
-- First drop the existing constraint
ALTER TABLE public.order_items DROP CONSTRAINT order_items_menu_item_id_fkey;

-- Make menu_item_id nullable so we can keep order history even after item deletion
ALTER TABLE public.order_items ALTER COLUMN menu_item_id DROP NOT NULL;

-- Re-add with SET NULL on delete
ALTER TABLE public.order_items ADD CONSTRAINT order_items_menu_item_id_fkey 
  FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE SET NULL;

-- Create notifications table for push notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',
  is_read BOOLEAN NOT NULL DEFAULT false,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Users can delete their own notifications
CREATE POLICY "Users can delete their own notifications" 
ON public.notifications 
FOR DELETE 
USING (user_id = ((current_setting('request.headers'::text, true))::json ->> 'x-clerk-user-id'::text));

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create function to notify on new chat message
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger AS $$
DECLARE
  v_order RECORD;
  v_recipient_id TEXT;
  v_shop_name TEXT;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = NEW.order_id;
  
  -- Get shop name
  SELECT shop_name INTO v_shop_name FROM public.shops WHERE id = v_order.shop_id;
  
  -- Determine recipient (opposite of sender)
  IF NEW.sender_role = 'student' THEN
    -- Notify shopkeeper
    SELECT owner_user_id INTO v_recipient_id FROM public.shops WHERE id = v_order.shop_id;
  ELSE
    -- Notify student
    v_recipient_id := v_order.user_id;
  END IF;
  
  -- Create notification
  INSERT INTO public.notifications (user_id, title, message, type, order_id)
  VALUES (
    v_recipient_id,
    'New Message',
    CASE WHEN NEW.sender_role = 'student' THEN 'You have a new message from a customer'
         ELSE 'You have a new message from ' || COALESCE(v_shop_name, 'Shop') END,
    'chat',
    NEW.order_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new messages
CREATE TRIGGER on_new_message
  AFTER INSERT ON public.order_messages
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- Create function to notify on payment status change
CREATE OR REPLACE FUNCTION public.notify_payment_update()
RETURNS trigger AS $$
DECLARE
  v_shop RECORD;
  v_shop_name TEXT;
BEGIN
  -- Only trigger on payment_status or payment_verified changes
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status OR 
     OLD.payment_verified IS DISTINCT FROM NEW.payment_verified THEN
    
    -- Get shop details
    SELECT * INTO v_shop FROM public.shops WHERE id = NEW.shop_id;
    v_shop_name := COALESCE(v_shop.shop_name, 'Shop');
    
    -- Notify student about payment verification
    IF NEW.payment_verified = true AND (OLD.payment_verified IS NULL OR OLD.payment_verified = false) THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (NEW.user_id, 'Payment Verified', 'Your payment has been verified by ' || v_shop_name, 'payment', NEW.id);
    END IF;
    
    -- Notify shopkeeper about new payment submission
    IF NEW.payment_status = 'submitted' AND OLD.payment_status = 'unpaid' THEN
      INSERT INTO public.notifications (user_id, title, message, type, order_id)
      VALUES (v_shop.owner_user_id, 'Payment Submitted', 'A customer has submitted payment for verification', 'payment', NEW.id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment updates
CREATE TRIGGER on_payment_update
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_update();
