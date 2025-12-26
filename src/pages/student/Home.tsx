import { useState } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useShops, Shop } from '@/hooks/useShops';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import BottomNav from '@/components/student/BottomNav';
import MenuItemCard from '@/components/student/MenuItemCard';
import CartDrawer from '@/components/student/CartDrawer';
import ShopCard from '@/components/student/ShopCard';
import ShopClosedBanner from '@/components/student/ShopClosedBanner';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';

const categories = ['all', 'breakfast', 'lunch', 'snacks', 'drinks'] as const;

const StudentHome = () => {
  const { user } = useUser();
  const { shops, isLoading: shopsLoading } = useShops();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const { menuItems, isLoading: menuLoading } = useMenuItems(selectedShop?.id);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  // Shop list view
  if (!selectedShop) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-3">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Campus Canteen</h1>
                <p className="text-xs text-muted-foreground">Hi, {user?.firstName || 'Student'}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <UserButton afterSignOutUrl="/auth" />
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4">Select a Shop</h2>
          
          {shopsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (<Skeleton key={i} className="h-20 rounded-lg" />))}
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No shops available yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} onClick={() => setSelectedShop(shop)} />
              ))}
            </div>
          )}
        </main>

        <BottomNav onCartClick={() => setCartOpen(true)} />
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    );
  }

  // Menu view for selected shop
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 bg-background/95 backdrop-blur border-b border-border z-40 px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSelectedShop(null)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">{selectedShop.shop_name}</h1>
              <p className="text-xs text-muted-foreground">
                {selectedShop.is_open ? 'Open' : 'Closed'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <UserButton afterSignOutUrl="/auth" />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {!selectedShop.is_open && (
          <ShopClosedBanner reopenTime={selectedShop.reopen_time} />
        )}

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search food..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
          {categories.map((cat) => (
            <Badge key={cat} variant={category === cat ? 'default' : 'secondary'} className="cursor-pointer capitalize whitespace-nowrap" onClick={() => setCategory(cat)}>
              {cat}
            </Badge>
          ))}
        </div>

        {/* Menu Grid */}
        {menuLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (<Skeleton key={i} className="h-48 rounded-lg" />))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No items found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item) => (
              <MenuItemCard key={item.id} item={item} disabled={!selectedShop.is_open} shopId={selectedShop.id} />
            ))}
          </div>
        )}
      </main>

      <BottomNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} shopOpen={selectedShop.is_open} shopId={selectedShop.id} />
    </div>
  );
};

export default StudentHome;
