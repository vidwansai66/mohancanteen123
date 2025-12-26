import { MenuItem } from '@/hooks/useMenuItems';
import { useCartStore } from '@/stores/cartStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItemCardProps {
  item: MenuItem;
  disabled?: boolean;
}

const MenuItemCard = ({ item, disabled }: MenuItemCardProps) => {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!item.in_stock || disabled) return;
    addItem({
      id: item.id,
      name: item.name,
      price: Number(item.price),
      image_url: item.image_url || undefined,
    });
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
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!item.in_stock || disabled}
            className="h-8"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default MenuItemCard;
