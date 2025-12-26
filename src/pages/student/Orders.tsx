import { useState } from 'react';
import { useOrders } from '@/hooks/useOrders';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OrderCard from '@/components/student/OrderCard';
import BottomNav from '@/components/student/BottomNav';
import CartDrawer from '@/components/student/CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList } from 'lucide-react';

const StudentOrders = () => {
  const { orders, isLoading } = useOrders(true);
  const [cartOpen, setCartOpen] = useState(false);

  const activeOrders = orders.filter((o) => !['completed', 'rejected'].includes(o.status));
  const pastOrders = orders.filter((o) => ['completed', 'rejected'].includes(o.status));

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-4">
        <h1 className="font-bold text-xl text-foreground">My Orders</h1>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="active">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="active" className="flex-1">Active ({activeOrders.length})</TabsTrigger>
            <TabsTrigger value="past" className="flex-1">Past</TabsTrigger>
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
              activeOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3">
            {pastOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No past orders</p>
              </div>
            ) : (
              pastOrders.map((order) => <OrderCard key={order.id} order={order} />)
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default StudentOrders;
