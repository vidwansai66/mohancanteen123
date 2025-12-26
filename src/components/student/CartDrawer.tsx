import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopOpen?: boolean;
  shopId?: string;
}

const CartDrawer = ({ open, onOpenChange, shopOpen = true, shopId }: CartDrawerProps) => {
  const { user } = useUser();
  const { toast } = useToast();
  const { items, updateQuantity, removeItem, clearShopCart, getShopItems, getShopTotalPrice, getTotalPrice } = useCartStore();
  const [notes, setNotes] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);

  // If shopId is provided, only show items from that shop
  const displayItems = shopId ? getShopItems(shopId) : items;
  const totalPrice = shopId ? getShopTotalPrice(shopId) : getTotalPrice();

  const handlePlaceOrder = async () => {
    if (!user || displayItems.length === 0 || !shopId) return;

    setIsPlacing(true);
    try {
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          shop_id: shopId,
          total: totalPrice,
          notes: notes || null,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = displayItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.id,
        quantity: item.quantity,
        price: item.price,
        item_name: item.name,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      clearShopCart(shopId);
      setNotes('');
      onOpenChange(false);

      toast({
        title: 'Order Placed!',
        description: 'Waiting for shopkeeper to accept your order.',
      });
    } catch (error) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsPlacing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        {displayItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="font-medium text-foreground mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground">
              Add some delicious items from the menu!
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto py-4 space-y-3">
              {displayItems.map((item) => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <Textarea
                placeholder="Add special instructions (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none"
                rows={2}
              />

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{totalPrice.toFixed(0)}</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPlacing || !shopOpen || !shopId}
              >
                {isPlacing ? 'Placing Order...' : shopOpen ? 'Place Order' : 'Shop is Closed'}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}

const CartItemRow = ({ item, onUpdateQuantity, onRemove }: CartItemRowProps) => {
  return (
    <div className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">{item.name}</h4>
        <p className="text-sm text-primary">₹{item.price}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CartDrawer;
