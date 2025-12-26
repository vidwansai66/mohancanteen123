import { Order } from '@/hooks/useOrders';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, CheckCircle, XCircle, Package, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: Order;
}

const statusConfig: Record<Order['status'], { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Waiting', color: 'bg-warning text-warning-foreground', icon: <Clock className="w-4 h-4" /> },
  accepted: { label: 'Accepted', color: 'bg-primary text-primary-foreground', icon: <CheckCircle className="w-4 h-4" /> },
  rejected: { label: 'Rejected', color: 'bg-destructive text-destructive-foreground', icon: <XCircle className="w-4 h-4" /> },
  preparing: { label: 'Preparing', color: 'bg-primary text-primary-foreground', icon: <ChefHat className="w-4 h-4" /> },
  ready: { label: 'Ready!', color: 'bg-success text-success-foreground', icon: <Package className="w-4 h-4" /> },
  completed: { label: 'Completed', color: 'bg-muted text-muted-foreground', icon: <CheckCircle className="w-4 h-4" /> },
};

const OrderCard = ({ order }: OrderCardProps) => {
  const config = statusConfig[order.status];

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(order.created_at), 'MMM d, h:mm a')}
          </p>
          <p className="text-sm font-medium text-foreground mt-1">
            Order #{order.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
        <Badge className={cn('flex items-center gap-1', config.color)}>
          {config.icon}
          {config.label}
        </Badge>
      </div>

      {/* Order Progress */}
      {order.status !== 'rejected' && order.status !== 'completed' && (
        <div className="mb-4">
          <OrderProgress status={order.status} />
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

      <div className="flex justify-between items-center pt-3 border-t border-border">
        <span className="font-medium text-foreground">Total</span>
        <span className="font-bold text-primary">₹{Number(order.total).toFixed(0)}</span>
      </div>
    </Card>
  );
};

const OrderProgress = ({ status }: { status: Order['status'] }) => {
  const steps = ['pending', 'accepted', 'preparing', 'ready'];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, index) => (
        <div key={step} className="flex-1 flex items-center">
          <div
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              index <= currentIndex ? 'bg-primary' : 'bg-muted'
            )}
          />
        </div>
      ))}
    </div>
  );
};

export default OrderCard;
