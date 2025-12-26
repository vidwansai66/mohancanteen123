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
import { Heart, ShoppingCart, Trash2, Package } from 'lucide-react';
import { format } from 'date-fns';

const StudentFavourites = () => {
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
    setCartOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-xl text-foreground">Favourites</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        <Tabs defaultValue="items">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="items" className="flex-1">Items ({favouriteItems.length})</TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">Orders ({favouriteOrders.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="items" className="space-y-3">
            {isLoading ? (
              [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)
            ) : favouriteItems.length === 0 ? (
              <div className="text-center py-12">
                <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No favourite items yet</p>
                <p className="text-sm text-muted-foreground">Add items from the menu to see them here</p>
              </div>
            ) : (
              favouriteItems.map((fav) => fav.menu_item && (
                <Card key={fav.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{fav.menu_item.name}</p>
                        {!fav.menu_item.in_stock && (
                          <Badge variant="secondary">Out of stock</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{fav.menu_item.category}</p>
                      <p className="font-bold text-primary mt-1">₹{Number(fav.menu_item.price).toFixed(0)}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeFavouriteItem(fav.menu_item_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        disabled={!fav.menu_item.in_stock || !fav.menu_item.shop_id}
                        onClick={() => fav.menu_item?.shop_id && handleAddToCart(fav.menu_item, fav.menu_item.shop_id)}
                      >
                        <ShoppingCart className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="orders" className="space-y-3">
            {isLoading ? (
              [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32" />)
            ) : favouriteOrders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No favourite orders yet</p>
                <p className="text-sm text-muted-foreground">Mark orders as favourite from your order history</p>
              </div>
            ) : (
              favouriteOrders.map((fav) => fav.order && (
                <Card key={fav.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">#{fav.order.id.slice(0, 8).toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(fav.order.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <p className="font-bold text-primary">₹{Number(fav.order.total).toFixed(0)}</p>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">
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
                      onClick={() => removeFavouriteOrder(fav.order_id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReorder(fav.order!)}
                    >
                      <ShoppingCart className="w-4 h-4 mr-1" />
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
