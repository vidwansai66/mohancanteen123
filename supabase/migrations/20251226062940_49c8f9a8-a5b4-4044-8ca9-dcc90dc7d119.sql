
-- Fix function search path for mark_messages_as_read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_order_id uuid, p_reader_role text)
RETURNS void AS $$
BEGIN
  UPDATE public.order_messages
  SET is_read = true
  WHERE order_id = p_order_id
    AND sender_role != p_reader_role
    AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
