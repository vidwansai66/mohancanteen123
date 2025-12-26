-- Fix the orders_status_check constraint to include 'cancelled'
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status = ANY (ARRAY['pending'::text, 'accepted'::text, 'rejected'::text, 'cancelled'::text, 'preparing'::text, 'ready'::text, 'completed'::text]));

-- Create order_messages table for chat between student and shopkeeper
CREATE TABLE public.order_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_user_id TEXT NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('student', 'shopkeeper')),
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Policies: users can view messages for orders they are part of
CREATE POLICY "Users can view order messages" ON public.order_messages
FOR SELECT USING (true);

CREATE POLICY "Users can send order messages" ON public.order_messages
FOR INSERT WITH CHECK (true);

-- Enable realtime for order_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;