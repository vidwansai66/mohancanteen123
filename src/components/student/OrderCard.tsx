import { Order } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format, differenceInHours } from 'date-fns';
import { Clock, CheckCircle, XCircle, Package, ChefHat, CreditCard, Heart, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
  onPayNow?: () => void;
  onCancel?: () => void;
  isFavourite?: boolean;
  onToggleFavourite?: () => void;
  onOpenChat?: () => void;
}

const statusConfig: Record<Order['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Waiting', color: 'bg-warning text-warning-foreground', icon: <Clock className="w-4 h-4" /> },
  accepted: { label: 'Accepted', color: 'bg-primary text-primary-foreground', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-destructive text-destructive-foreground', icon: <XCircle className="w-4 h-4" /> },
  cancelled: { label: 'Cancelled', color: 'bg-muted text-muted-foreground', icon: <XCircle className="w-4 h-4" /> },
  preparing: { label: 'Preparing', color: 'bg-primary text-primary-foreground', icon: <ChefHat className="w-4 h-4" /> },
  ready: { label: 'Ready!', color: 'bg-success text-success-foreground', icon: <Package className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-muted text-muted-foreground', icon: <CheckCircle className="w-4 h-4" /> },
};

const OrderCard = ({ order, onPayNow, onCancel, isFavourite, onToggleFavourite, onOpenChat }: OrderCardProps) => {
  const config = statusConfig[order.status];

  const paymentPending = order.status === 'accepted' && order.payment_status === 'unpaid';
  const canPayNow = paymentPending && !!onPayNow;
  const canCancel = order.status === 'pending' && !!onCancel;
  const canChat = !['completed', 'rejected', 'cancelled'].includes(order.status) && !!onOpenChat;

  // Check if order should be auto-cancelled (pending for > 5 hours)
  const hoursPending = order.status === 'pending'
    ? differenceInHours(new Date(), new Date(order.created_at))
    : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-2">
          {onToggleFavourite && (
            <button onClick={onToggleFavourite} className="mt-1">
              <Heart
                className={cn(
                  'w-5 h-5 transition-colors',
                  isFavourite ? 'fill-destructive text-destructive' : 'text-muted-foreground'
                )}
              />
            </button>
          )}
          <div>
            <p className="text-xs text-muted-foreground">
              {format(new Date(order.created_at), 'MMM d, h:mm a')}
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              Order #{order.id.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end">
          <Badge className={cn('flex items-center gap-1', config.color)}>
            {config.icon}
            {config.label}
          </Badge>
          {paymentPending && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <CreditCard className="w-3 h-3" />
              Payment pending
            </Badge>
          )}
          {hoursPending >= 5 && (
            <Badge variant="outline" className="text-destructive border-destructive text-xs">
              Will auto-cancel soon
            </Badge>
          )}
        </div>
      </div>

      {/* Order Progress */}
      {order.status !== 'rejected' && order.status !== 'completed' && order.status !== 'cancelled' && (
        <div className="mb-4">
          <OrderProgress status={order.status} paymentPending={paymentPending} />
        </div>
      )}

      {/* Payment Notice */}
      {paymentPending && (
        <div className="mb-3 p-3 bg-destructive/10 rounded-lg text-destructive text-sm">
          <p className="font-medium">Payment Required</p>
          <p className="text-xs mt-1">After paying ₹{Number(order.total).toFixed(0)} at the counter, tap "Pay Now".</p>
        </div>
      )}

      {/* Items */}
      <div className="space-y-1 mb-3">
        {order.order_items?.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              {item.quantity}x {item.item_name}
            </span>
            <span className="text-foreground">₹{Number(item.price) * item.quantity}</span>
          </div>
        ))}
      </div>

      {order.notes && (
        <p className="text-xs text-muted-foreground italic mb-3">
          Note: {order.notes}
        </p>
      )}

      {(canPayNow || canCancel || canChat) && (
        <div className="flex gap-2 mb-3">
          {canCancel && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="flex-1">
                  Cancel Order
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this order?</AlertDialogTitle>
                  <AlertDialogDescription>
                    You can only cancel before the shopkeeper accepts.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go back</AlertDialogCancel>
                  <AlertDialogAction onClick={onCancel}>Cancel order</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canPayNow && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" className="flex-1">
                  Pay Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm payment</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tap confirm after you've paid at the counter.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Not yet</AlertDialogCancel>
                  <AlertDialogAction onClick={onPayNow}>I paid</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canChat && (
            <Button variant="outline" size="sm" onClick={onOpenChat} className={cn(!canCancel && !canPayNow && 'flex-1')}>
              <MessageCircle className="w-4 h-4 mr-1" />
              Chat with Shop
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="font-medium text-foreground">Total</span>
        <span className="font-bold text-primary">₹{Number(order.total).toFixed(0)}</span>
      </div>
    </Card>
  );
};

const OrderProgress = ({ status, paymentPending }: { status: Order['status']; paymentPending?: boolean }) => {
  const steps = ['pending', 'accepted', 'preparing', 'ready'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step} className="flex-1 flex items-center">
          <div
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index < currentIndex
                ? 'bg-primary'
                : index === currentIndex && paymentPending
                  ? 'bg-destructive animate-pulse'
                  : index === currentIndex
                    ? 'bg-primary'
                    : 'bg-muted'
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default OrderCard;
