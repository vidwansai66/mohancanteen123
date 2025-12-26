import { useState } from 'react';
import { useFavourites } from '@/hooks/useFavourites';
import { useCartStore } from '@/stores/cartStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import BottomNav from '@/components/student/BottomNav';
import CartDrawer from '@/components/student/CartDrawer';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, ShoppingCart, Trash2, Package, UtensilsCrossed } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const StudentFavourites = () => {
  const { toast } = useToast();
  const { favouriteItems, favouriteOrders, isLoading, removeFavouriteItem, removeFavouriteOrder } = useFavourites();
  const [cartOpen, setCartOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = (item: NonNullable<typeof favouriteItems[0]['menu_item']>, shopId: string) => {
    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url || undefined,
      shop_id: shopId
    });
    toast({ title: `${item.name} added to cart` });
  };

  const handleReorder = (order: NonNullable<typeof favouriteOrders[0]['order']>) => {
    if (!order.shop_id) return;
    order.order_items?.forEach(item => {
      for (let i = 0; i < item.quantity; i++) {
        addItem({
          id: item.menu_item_id,
          name: item.item_name,
          price: item.price,
          shop_id: order.shop_id!
        });
      }
    });
    toast({ title: 'Items added to cart' });
    setCartOpen(true);
  };

  const handleRemoveItem = async (menuItemId: string, name: string) => {
    await removeFavouriteItem(menuItemId);
    toast({ title: `${name} removed from favourites` });
  };

  const handleRemoveOrder = async (orderId: string) => {
    await removeFavouriteOrder(orderId);
    toast({ title: 'Order removed from favourites' });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-4 safe-area-top">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-xl text-foreground">Favourites</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="items">
          <TabsList className="w-full mb-4 h-12">
            <TabsTrigger value="items" className="flex-1 h-10 touch-feedback">
              Items ({favouriteItems.length})
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1 h-10 touch-feedback">
              Orders ({favouriteOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-3">
            {isLoading ? (
              [...Array(4)].map((_, i) => (
                <Skeleton key={i} className={cn("h-24 rounded-xl skeleton-shimmer", `stagger-${i + 1}`)} />
              ))
            ) : favouriteItems.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <UtensilsCrossed className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Favourite Items</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Tap the heart icon on menu items to save them here for quick access
                </p>
              </div>
            ) : (
              favouriteItems.map((fav, index) => fav.menu_item && (
                <Card key={fav.id} className={cn("p-4 animate-fade-in-up transition-all hover:shadow-md", `stagger-${(index % 4) + 1}`)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{fav.menu_item.name}</p>
                        {!fav.menu_item.in_stock && (
                          <Badge variant="secondary" className="text-xs">Out of stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">{fav.menu_item.category}</p>
                      <p className="font-bold text-primary mt-1">₹{Number(fav.menu_item.price).toFixed(0)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleRemoveItem(fav.menu_item_id, fav.menu_item?.name || '')}
                        className="min-w-[44px] min-h-[44px] touch-feedback"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                      <Button
                        size="icon"
                        disabled={!fav.menu_item.in_stock || !fav.menu_item.shop_id}
                        onClick={() => fav.menu_item?.shop_id && handleAddToCart(fav.menu_item, fav.menu_item.shop_id)}
                        className="min-w-[44px] min-h-[44px] touch-feedback"
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <Skeleton key={i} className={cn("h-32 rounded-xl skeleton-shimmer", `stagger-${i + 1}`)} />
              ))
            ) : favouriteOrders.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">No Favourite Orders</h3>
                <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                  Save your favourite orders to quickly reorder them later
                </p>
              </div>
            ) : (
              favouriteOrders.map((fav, index) => fav.order && (
                <Card key={fav.id} className={cn("p-4 animate-fade-in-up transition-all hover:shadow-md", `stagger-${(index % 4) + 1}`)}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium">#{fav.order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(fav.order.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <p className="font-bold text-primary text-lg">₹{Number(fav.order.total).toFixed(0)}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {fav.order.order_items?.map((item, idx) => (
                      <span key={item.id}>
                        {item.quantity}x {item.item_name}
                        {idx < (fav.order?.order_items?.length || 0) - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveOrder(fav.order_id)}
                      className="min-h-[44px] touch-feedback"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReorder(fav.order!)}
                      className="flex-1 min-h-[44px] touch-feedback"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Reorder
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
};

export default StudentFavourites;
