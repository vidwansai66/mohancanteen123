import { MenuItem } from '@/hooks/useMenuItems';
import { useCartStore } from '@/stores/cartStore';
import { useFavourites } from '@/hooks/useFavourites';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, ImageOff, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  disabled?: boolean;
  shopId: string;
}

const MenuItemCard = ({ item, disabled, shopId }: MenuItemCardProps) => {
  const { items, addItem, updateQuantity } = useCartStore();
  const { addFavouriteItem, removeFavouriteItem, isItemFavourite } = useFavourites();

  const cartItem = items.find((i) => i.id === item.id && i.shop_id === shopId);
  const quantity = cartItem?.quantity || 0;
  const isFavourite = isItemFavourite(item.id);

  const handleAddToCart = () => {
    if (!item.in_stock || disabled) return;
    addItem({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image_url: item.image_url || undefined,
      shop_id: shopId,
    });
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (disabled) return;
    updateQuantity(item.id, newQuantity);
  };

  const handleFavouriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavourite) {
      removeFavouriteItem(item.id);
    } else {
      addFavouriteItem(item.id);
    }
  };

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      !item.in_stock && 'opacity-60',
      disabled && 'opacity-50 pointer-events-none'
    )}>
      <div className="relative h-32 bg-secondary">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
        {!item.in_stock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <Badge variant="destructive">Out of Stock</Badge>
          </div>
        )}
        {/* Favourite Button */}
        <button
          onClick={handleFavouriteToggle}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center transition-colors hover:bg-background"
        >
          <Heart
            className={cn(
              'w-4 h-4 transition-colors',
              isFavourite ? 'fill-destructive text-destructive' : 'text-muted-foreground'
            )}
          />
        </button>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {item.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-3">
          <span className="font-bold text-primary">₹{Number(item.price).toFixed(0)}</span>
          
          {quantity > 0 ? (
            // Quantity controls like Swiggy/Zomato
            <div className="flex items-center gap-1 bg-primary text-primary-foreground rounded-md">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-primary-foreground/10"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={disabled}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-6 text-center font-semibold text-sm">{quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-primary-foreground/10"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={disabled || !item.in_stock}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            // Add button
            <Button
              size="sm"
              onClick={handleAddToCart}
              disabled={!item.in_stock || disabled}
              className="h-8"
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default MenuItemCard;
