import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useCartStore, CartItem } from '@/stores/cartStore';
import { Minus, Plus, Trash2, ShoppingBag, Loader2, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopOpen?: boolean;
  shopId?: string;
}

const CartDrawer = ({ open, onOpenChange, shopOpen = true, shopId }: CartDrawerProps) => {
  const { user } = useUser();
  const supabase = useSupabaseWithClerk();
  const { toast } = useToast();
  const { items, updateQuantity, removeItem, clearShopCart, getShopItems, getShopTotalPrice, getTotalPrice } = useCartStore();
  const [notes, setNotes] = useState('');
  const [isPlacing, setIsPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const displayItems = shopId ? getShopItems(shopId) : items;
  const totalPrice = shopId ? getShopTotalPrice(shopId) : getTotalPrice();

  const handlePlaceOrder = async () => {
    if (!user || displayItems.length === 0 || !shopId) return;

    setIsPlacing(true);
    try {
      // Prepare items with only IDs and quantities - prices validated server-side
      const items = displayItems.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      }));

      // Call RPC function for server-side validated order creation
      const { data: orderId, error } = await supabase.rpc('create_validated_order', {
        p_user_id: user.id,
        p_shop_id: shopId,
        p_notes: notes || null,
        p_items: items,
      });

      if (error) throw error;

      clearShopCart(shopId);
      setNotes('');
      setOrderSuccess(true);

      setTimeout(() => {
        setOrderSuccess(false);
        onOpenChange(false);
      }, 2000);

      toast({
        title: 'Order Placed! 🎉',
        description: 'Waiting for shopkeeper to accept your order.',
      });
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to place order. Please try again.',
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
            {displayItems.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({displayItems.length} {displayItems.length === 1 ? 'item' : 'items'})
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {orderSuccess ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 animate-scale-in">
            <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h3 className="font-semibold text-foreground text-lg mb-2">Order Placed!</h3>
            <p className="text-sm text-muted-foreground">
              Check your orders page for updates
            </p>
          </div>
        ) : displayItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 animate-fade-in">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">Your cart is empty</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Add some delicious items from the menu to get started!
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-auto py-4 space-y-3 scrollbar-none">
              {displayItems.map((item, index) => (
                <div key={item.id} className={cn("animate-fade-in-up", `stagger-${(index % 4) + 1}`)}>
                  <CartItemRow
                    item={item}
                    onUpdateQuantity={updateQuantity}
                    onRemove={removeItem}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-border">
              <Textarea
                placeholder="Add special instructions (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="resize-none min-h-[60px]"
                rows={2}
              />

              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary text-xl">₹{totalPrice.toFixed(0)}</span>
              </div>

              <Button
                className="w-full min-h-[52px] text-base font-semibold touch-feedback"
                size="lg"
                onClick={handlePlaceOrder}
                disabled={isPlacing || !shopOpen || !shopId}
              >
                {isPlacing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Placing Order...
                  </>
                ) : shopOpen ? (
                  'Place Order'
                ) : (
                  'Shop is Closed'
                )}
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
    <div className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3 transition-all hover:bg-secondary/70">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground truncate">{item.name}</h4>
        <p className="text-sm text-primary font-semibold">₹{item.price}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-w-[36px] rounded-lg touch-feedback"
          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="w-8 text-center font-semibold">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 min-w-[36px] rounded-lg touch-feedback"
          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
          disabled={item.quantity >= 99}
        >
          <Plus className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 min-w-[36px] text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg touch-feedback"
          onClick={() => onRemove(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default CartDrawer;
