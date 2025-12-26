-- Add is_read column to order_messages for tracking read status
ALTER TABLE public.order_messages ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT false;

-- Create function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_order_id uuid, p_reader_role text)
RETURNS void AS $$
BEGIN
  UPDATE public.order_messages
  SET is_read = true
  WHERE order_id = p_order_id
    AND sender_role != p_reader_role
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow RLS policy for updating message read status
CREATE POLICY "Users can mark messages as read" 
ON public.order_messages 
FOR UPDATE 
USING (true)
WITH CHECK (true);