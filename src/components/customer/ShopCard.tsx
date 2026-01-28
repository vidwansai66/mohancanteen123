import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store, ChevronRight } from 'lucide-react';
import { PublicShop } from '@/hooks/useShops';
import { cn } from '@/lib/utils';

interface ShopCardProps {
  shop: PublicShop;
  onClick: () => void;
}

const ShopCard = ({ shop, onClick }: ShopCardProps) => {
  return (
    <Card
      className="p-4 cursor-pointer transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] touch-feedback"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors",
          shop.is_open ? "bg-primary/10" : "bg-muted"
        )}>
          <Store className={cn(
            "w-7 h-7 transition-colors",
            shop.is_open ? "text-primary" : "text-muted-foreground"
          )} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{shop.shop_name}</h3>
          <p className="text-sm text-muted-foreground">
            {shop.is_open ? 'Tap to view menu' : 'Currently closed'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge 
            variant={shop.is_open ? 'default' : 'secondary'}
            className={cn(
              "transition-all",
              shop.is_open && "animate-pulse-glow"
            )}
          >
            {shop.is_open ? 'Open' : 'Closed'}
          </Badge>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>
    </Card>
  );
};

export default ShopCard;
