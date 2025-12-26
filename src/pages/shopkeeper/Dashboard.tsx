import { UserButton } from '@clerk/clerk-react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useShopStatus } from '@/hooks/useShopStatus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';
import { Store, Menu, Check, X } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const ShopkeeperDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orders, updateOrderStatus, isLoading } = useOrders(false);
  const { shopStatus, updateShopStatus } = useShopStatus();

  const activeOrders = orders.filter((o) => !['completed', 'rejected'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed').slice(0, 40);

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    const success = await updateOrderStatus(orderId, status);
    if (success) toast({ title: 'Order updated' });
  };

  const handleShopToggle = async (isOpen: boolean) => {
    await updateShopStatus(isOpen);
    toast({ title: isOpen ? 'Shop is now open' : 'Shop is now closed' });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <h1 className="font-bold text-foreground">Shopkeeper Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Shop</span>
              <Switch checked={shopStatus?.is_open} onCheckedChange={handleShopToggle} />
              <Badge variant={shopStatus?.is_open ? 'default' : 'secondary'}>{shopStatus?.is_open ? 'Open' : 'Closed'}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/shopkeeper/menu')}><Menu className="w-4 h-4 mr-2" />Menu</Button>
            <UserButton afterSignOutUrl="/auth" />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Orders */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Active Orders ({activeOrders.length})</h2>
          <div className="space-y-3">
            {activeOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No active orders</Card>
            ) : (
              activeOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{order.profile?.full_name || 'Customer'} • {format(new Date(order.created_at), 'h:mm a')}</p>
                    </div>
                    <Badge>{order.status}</Badge>
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    {order.order_items?.map((item) => (<div key={item.id}>{item.quantity}x {item.item_name}</div>))}
                  </div>
                  <p className="font-bold text-primary mb-3">₹{Number(order.total).toFixed(0)}</p>
                  {order.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleStatusChange(order.id, 'accepted')}><Check className="w-4 h-4 mr-1" />Accept</Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(order.id, 'rejected')}><X className="w-4 h-4 mr-1" />Reject</Button>
                    </div>
                  ) : (
                    <Select value={order.status} onValueChange={(v) => handleStatusChange(order.id, v as Order['status'])}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="preparing">Preparing</SelectItem>
                        <SelectItem value="ready">Ready</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Completed Orders */}
        <div>
          <h2 className="font-semibold text-lg mb-4">Recent Completed</h2>
          <div className="space-y-3">
            {completedOrders.length === 0 ? (
              <Card className="p-8 text-center text-muted-foreground">No completed orders yet</Card>
            ) : (
              completedOrders.map((order) => (
                <Card key={order.id} className="p-4 opacity-70">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-medium">#{order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">{format(new Date(order.created_at), 'MMM d, h:mm a')}</p>
                    </div>
                    <p className="font-bold">₹{Number(order.total).toFixed(0)}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShopkeeperDashboard;
