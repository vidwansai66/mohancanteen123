-- Create a trigger to delete order messages when order is completed, cancelled, or rejected
CREATE OR REPLACE FUNCTION public.delete_order_messages_on_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IN ('completed', 'cancelled', 'rejected') AND OLD.status NOT IN ('completed', 'cancelled', 'rejected') THEN
    DELETE FROM public.order_messages WHERE order_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_order_completion_delete_messages
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.delete_order_messages_on_completion();