import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Store } from 'lucide-react';
import { Shop } from '@/hooks/useShops';

interface ShopCardProps {
  shop: Shop;
  onClick: () => void;
}

const ShopCard = ({ shop, onClick }: ShopCardProps) => {
  return (
    <Card
      className="p-4 cursor-pointer hover:border-primary transition-all hover:shadow-md"
      onClick={onClick}
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <Store className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{shop.shop_name}</h3>
          <p className="text-sm text-muted-foreground">Tap to view menu</p>
        </div>
        <Badge variant={shop.is_open ? 'default' : 'secondary'}>
          {shop.is_open ? 'Open' : 'Closed'}
        </Badge>
      </div>
    </Card>
  );
};

export default ShopCard;
