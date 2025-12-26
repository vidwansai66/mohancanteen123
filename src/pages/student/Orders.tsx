import { useState, useEffect } from 'react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useFavourites } from '@/hooks/useFavourites';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderCard from '@/components/student/OrderCard';
import BottomNav from '@/components/student/BottomNav';
import CartDrawer from '@/components/student/CartDrawer';
import UPIPaymentDialog from '@/components/student/UPIPaymentDialog';
import OrderChatDialog from '@/components/OrderChatDialog';
import NotificationBell from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours } from 'date-fns';

const StudentOrders = () => {
  const { toast } = useToast();
  const { orders, isLoading, cancelPendingOrder, refetch } = useOrders(true);
  const { isOrderFavourite, addFavouriteOrder, removeFavouriteOrder } = useFavourites();
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  // Find selected order for chat to get shop name
  const chatOrder = orders.find((o) => o.id === chatOrderId);

  // Auto-cancel orders pending for more than 5 hours
  useEffect(() => {
    const checkAutoCancelOrders = async () => {
      const pendingOrders = orders.filter((o) => o.status === 'pending');
      for (const order of pendingOrders) {
        const hoursPending = differenceInHours(new Date(), new Date(order.created_at));
        if (hoursPending >= 5) {
          await cancelPendingOrder(order.id);
          toast({
            title: 'Order auto-cancelled',
            description: `Order #${order.id.slice(0, 8).toUpperCase()} was cancelled after 5 hours`,
            variant: 'destructive',
          });
        }
      }
    };

    if (orders.length > 0) {
      checkAutoCancelOrders();
    }
  }, [orders]);

  const activeOrders = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status)).slice(0, 10);

  const handlePayNow = (order: Order) => {
    setPaymentOrder(order);
  };

  const handleCancelOrder = async (orderId: string) => {
    const ok = await cancelPendingOrder(orderId);
    if (ok) {
      toast({ title: 'Order cancelled' });
    }
  };

  const handleToggleFavourite = async (orderId: string) => {
    if (isOrderFavourite(orderId)) {
      await removeFavouriteOrder(orderId);
    } else {
      await addFavouriteOrder(orderId);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-4">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="font-bold text-xl text-foreground">My Orders</h1>
          <NotificationBell />
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="active">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-40" />)
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No active orders</p>
              </div>
            ) : (
              activeOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCancel={order.status === 'pending' ? () => handleCancelOrder(order.id) : undefined}
                  onPayNow={order.status === 'accepted' && order.payment_status === 'unpaid' ? () => handlePayNow(order) : undefined}
                  isFavourite={isOrderFavourite(order.id)}
                  onToggleFavourite={() => handleToggleFavourite(order.id)}
                  onOpenChat={() => setChatOrderId(order.id)}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {pastOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No past orders</p>
              </div>
            ) : (
              pastOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  isFavourite={isOrderFavourite(order.id)}
                  onToggleFavourite={() => handleToggleFavourite(order.id)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />

      <UPIPaymentDialog
        order={paymentOrder}
        open={!!paymentOrder}
        onOpenChange={(open) => !open && setPaymentOrder(null)}
        onPaymentSubmitted={refetch}
      />

      <OrderChatDialog
        orderId={chatOrderId}
        open={!!chatOrderId}
        onOpenChange={(open) => !open && setChatOrderId(null)}
        currentUserRole="student"
        shopName={chatOrder?.shop?.shop_name}
      />
    </div>
  );
};

export default StudentOrders;
