import { useState } from 'react';
import { UserButton } from '@clerk/clerk-react';
import { useOrders, Order } from '@/hooks/useOrders';
import { useMyShop } from '@/hooks/useShops';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { useNavigate } from 'react-router-dom';
import { Store, Menu, Check, X, CreditCard, AlertCircle, Settings, Loader2, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import ShopSettingsDialog from '@/components/shopkeeper/ShopSettingsDialog';
import OrderChatDialog from '@/components/OrderChatDialog';

const ShopkeeperDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { shop, isLoading: shopLoading, updateShop } = useMyShop();
  const { orders, updateOrderStatus, updatePaymentStatus, isLoading } = useOrders(false, shop?.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  const activeOrders = orders.filter((o) => !['completed', 'rejected', 'cancelled'].includes(o.status));
  const completedOrders = orders.filter((o) => o.status === 'completed').slice(0, 40);

  // Find chat order for student name
  const chatOrder = orders.find((o) => o.id === chatOrderId);

  const handleStatusChange = async (orderId: string, status: Order['status']) => {
    const success = await updateOrderStatus(orderId, status);
    if (success) toast({ title: 'Order updated' });
  };

  const handlePaymentConfirm = async (orderId: string) => {
    const success = await updatePaymentStatus(orderId, 'paid');
    if (success) toast({ title: 'Payment confirmed' });
  };

  const handleShopToggle = async (isOpen: boolean) => {
    const success = await updateShop({ is_open: isOpen });
    if (success) {
      toast({ title: isOpen ? 'Shop is now open' : 'Shop is now closed' });
    }
  };

  // Check if order can be updated beyond accepted (requires payment)
  const canUpdateStatus = (order: Order) => {
    if (order.status === 'pending') return true;
    if (order.status === 'accepted' && order.payment_status === 'unpaid') return false;
    return true;
  };

  if (shopLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <Store className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">No Shop Found</h1>
        <p className="text-muted-foreground text-center mb-4">
          You don't have a shop set up yet. Please contact support.
        </p>
        <UserButton afterSignOutUrl="/auth" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <Store className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-bold text-foreground">{shop.shop_name}</h1>
              {!shop.upi_id && <p className="text-xs text-destructive">Set up UPI to receive payments</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground hidden sm:inline">Shop</span>
              <Switch checked={shop.is_open} onCheckedChange={handleShopToggle} />
              <Badge variant={shop.is_open ? 'default' : 'secondary'} className="hidden sm:inline-flex">
                {shop.is_open ? 'Open' : 'Closed'}
              </Badge>
            </div>
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/shopkeeper/menu')}>
              <Menu className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Menu</span>
            </Button>
            <UserButton afterSignOutUrl="/auth" />
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* UPI Setup Warning */}
        {!shop.upi_id && (
          <div className="lg:col-span-2">
            <Card className="p-4 bg-destructive/10 border-destructive/20">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div className="flex-1">
                  <p className="font-medium text-destructive">UPI Not Configured</p>
                  <p className="text-sm text-muted-foreground">
                    Set up your UPI ID in settings so students can pay you directly.
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSettingsOpen(true)}>
                  Set Up UPI
                </Button>
              </div>
            </Card>
          </div>
        )}

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
                      <p className="text-xs text-muted-foreground">
                        {order.profile?.full_name || 'Customer'} • {format(new Date(order.created_at), 'h:mm a')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge>{order.status}</Badge>
                      {order.status !== 'pending' && order.status !== 'rejected' && (
                        <Badge variant={order.payment_status === 'paid' ? 'default' : 'destructive'}>
                          {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-sm space-y-1 mb-3">
                    {order.order_items?.map((item) => (
                      <div key={item.id}>
                        {item.quantity}x {item.item_name}
                      </div>
                    ))}
                  </div>
                  <p className="font-bold text-primary mb-3">₹{Number(order.total).toFixed(0)}</p>

                  {/* Chat Button */}
                  <Button variant="outline" size="sm" className="w-full mb-3" onClick={() => setChatOrderId(order.id)}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat with {order.profile?.full_name || 'Customer'}
                  </Button>

                  {order.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleStatusChange(order.id, 'accepted')}>
                        <Check className="w-4 h-4 mr-1" />
                        Accept
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleStatusChange(order.id, 'rejected')}>
                        <X className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  ) : order.status === 'accepted' && order.payment_status === 'unpaid' ? (
                    // Waiting for payment - check if student submitted screenshot
                    <div className="space-y-3">
                      {order.payment_screenshot_url ? (
                        // Student submitted payment proof - shopkeeper needs to verify
                        <>
                          <div className="p-3 bg-yellow-500/10 rounded-lg space-y-2">
                            <p className="text-sm font-medium text-yellow-600">
                              Payment screenshot submitted - Verify & Confirm
                            </p>
                            <a
                              href={order.payment_screenshot_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-primary underline block"
                            >
                              Open Payment Screenshot
                            </a>
                            <div className="overflow-hidden rounded-md border border-border">
                              <AspectRatio ratio={16 / 9}>
                                <img
                                  src={order.payment_screenshot_url}
                                  alt={`Payment screenshot for order #${order.id.slice(0, 8).toUpperCase()}`}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                />
                              </AspectRatio>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => handlePaymentConfirm(order.id)} className="w-full">
                            <Check className="w-4 h-4 mr-2" />
                            Confirm Payment Received
                          </Button>
                        </>
                      ) : (
                        // No payment proof yet
                        <>
                          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg text-destructive">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-sm font-medium">Waiting for student to pay</span>
                          </div>
                          <Button size="sm" onClick={() => handlePaymentConfirm(order.id)} className="w-full" variant="outline">
                            <CreditCard className="w-4 h-4 mr-2" />
                            Confirm Payment (Cash/Manual)
                          </Button>
                        </>
                      )}
                    </div>
                  ) : order.status === 'accepted' && order.payment_status === 'paid' ? (
                    // Payment verified - can proceed with order
                    <div className="space-y-3">
                      <div className="p-3 bg-green-500/10 rounded-lg">
                        <p className="text-sm font-medium text-green-600">✓ Payment Verified</p>
                      </div>
                      <Select
                        value={order.status}
                        onValueChange={(v) => handleStatusChange(order.id, v as Order['status'])}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="preparing">Preparing</SelectItem>
                          <SelectItem value="ready">Ready</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Select
                      value={order.status}
                      onValueChange={(v) => handleStatusChange(order.id, v as Order['status'])}
                      disabled={!canUpdateStatus(order)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(order.created_at), 'MMM d, h:mm a')}
                      </p>
                    </div>
                    <p className="font-bold">₹{Number(order.total).toFixed(0)}</p>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>

      <ShopSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} shop={shop} onUpdate={updateShop} />

      <OrderChatDialog
        orderId={chatOrderId}
        open={!!chatOrderId}
        onOpenChange={(open) => !open && setChatOrderId(null)}
        currentUserRole="shopkeeper"
        studentName={chatOrder?.profile?.full_name}
        shopName={shop.shop_name}
      />
    </div>
  );
};

export default ShopkeeperDashboard;
