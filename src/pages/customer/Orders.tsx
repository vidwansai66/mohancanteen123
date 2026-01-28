import { useState, useEffect } from 'react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useFavourites } from '@/hooks/useFavourites';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import OrderCard from '@/components/customer/OrderCard';
import BottomNav from '@/components/customer/BottomNav';
import CartDrawer from '@/components/customer/CartDrawer';
import UPIPaymentDialog from '@/components/customer/UPIPaymentDialog';
import OrderChatDialog from '@/components/OrderChatDialog';
import NotificationBell from '@/components/NotificationBell';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, RefreshCw, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';

const StudentOrders = () => {
  const { toast } = useToast();
  const { orders, isLoading, cancelPendingOrder, refetch } = useOrders(true);
  const { isOrderFavourite, addFavouriteOrder, removeFavouriteOrder } = useFavourites();
  const [cartOpen, setCartOpen] = useState(false);
  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  }, [orders, cancelPendingOrder, toast]);

  const activeOrders = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const pastOrders = orders.filter((o) => ['completed', 'rejected', 'cancelled'].includes(o.status)).slice(0, 10);

  const handlePayNow = (order: Order) => {
    setPaymentOrder(order);
  };

  const handleCancelOrder = async (orderId: string) => {
    const ok = await cancelPendingOrder(orderId);
    if (ok) {
      toast({ title: 'Order cancelled successfully' });
    }
  };

  const handleToggleFavourite = async (orderId: string) => {
    if (isOrderFavourite(orderId)) {
      await removeFavouriteOrder(orderId);
      toast({ title: 'Removed from favourites' });
    } else {
      await addFavouriteOrder(orderId);
      toast({ title: 'Added to favourites' });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4 safe-area-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <h1 className="font-bold text-xl text-foreground">My Orders</h1>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="min-w-[44px] min-h-[44px]"
            >
              <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
            </Button>
            <NotificationBell />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="active">
          <TabsList className="w-full mb-4 h-12">
            <TabsTrigger value="active" className="flex-1 h-10 touch-feedback">
              Active ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="past" className="flex-1 h-10 touch-feedback">
              Past
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className={cn("h-48 rounded-xl skeleton-shimmer", `stagger-${i + 1}`)} />
              ))
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Active Orders</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  You don't have any orders in progress. Browse the menu to place your first order!
                </p>
              </div>
            ) : (
              activeOrders.map((order, index) => (
                <div key={order.id} className={cn("animate-fade-in-up", `stagger-${(index % 4) + 1}`)}>
                  <OrderCard
                    order={order}
                    onCancel={order.status === 'pending' ? () => handleCancelOrder(order.id) : undefined}
                    onPayNow={order.status === 'accepted' && order.payment_status === 'unpaid' ? () => handlePayNow(order) : undefined}
                    isFavourite={isOrderFavourite(order.id)}
                    onToggleFavourite={() => handleToggleFavourite(order.id)}
                    onOpenChat={() => setChatOrderId(order.id)}
                  />
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {pastOrders.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Past Orders</h3>
                <p className="text-muted-foreground text-sm">
                  Your completed orders will appear here
                </p>
              </div>
            ) : (
              pastOrders.map((order, index) => (
                <div key={order.id} className={cn("animate-fade-in-up", `stagger-${(index % 4) + 1}`)}>
                  <OrderCard
                    order={order}
                    isFavourite={isOrderFavourite(order.id)}
                    onToggleFavourite={() => handleToggleFavourite(order.id)}
                  />
                </div>
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
