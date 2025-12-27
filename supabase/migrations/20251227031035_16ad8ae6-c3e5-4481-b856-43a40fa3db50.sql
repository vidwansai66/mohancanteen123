-- Enable automatic notifications based on messages and payment status changes

-- Chat message → notification
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.order_messages;
CREATE TRIGGER trg_notify_new_message
AFTER INSERT ON public.order_messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_message();

-- Payment status / verification changes → notification
DROP TRIGGER IF EXISTS trg_notify_payment_update ON public.orders;
CREATE TRIGGER trg_notify_payment_update
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_payment_update();
