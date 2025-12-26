import { useState, useMemo, useCallback } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useShops, Shop } from '@/hooks/useShops';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, UtensilsCrossed, ArrowLeft, Store, RefreshCw } from 'lucide-react';
import BottomNav from '@/components/student/BottomNav';
import MenuItemCard from '@/components/student/MenuItemCard';
import CartDrawer from '@/components/student/CartDrawer';
import ShopCard from '@/components/student/ShopCard';
import ShopClosedBanner from '@/components/student/ShopClosedBanner';
import { Skeleton } from '@/components/ui/skeleton';
import NotificationBell from '@/components/NotificationBell';
import { cn } from '@/lib/utils';

const categories = ['all', 'breakfast', 'lunch', 'snacks', 'drinks'] as const;

// Debounce hook for search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useMemo(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

const StudentHome = () => {
  const { user } = useUser();
  const { shops, isLoading: shopsLoading, refetch: refetchShops } = useShops();
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const { menuItems, isLoading: menuLoading } = useMenuItems(selectedShop?.id);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [menuItems, debouncedSearch, category]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetchShops();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetchShops]);

  // Shop list view
  if (!selectedShop) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg">
                <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-bold text-foreground">Campus Canteen</h1>
                <p className="text-xs text-muted-foreground">Hi, {user?.firstName || 'Student'}!</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="min-w-[44px] min-h-[44px]"
              >
                <RefreshCw className={cn("w-5 h-5", isRefreshing && "animate-spin")} />
              </Button>
              <NotificationBell />
              <UserButton afterSignOutUrl="/auth" />
            </div>
          </div>
        </header>

        <main className="px-4 py-4 max-w-2xl mx-auto">
          <h2 className="text-lg font-semibold text-foreground mb-4">Select a Shop</h2>
          
          {shopsLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className={cn("h-20 rounded-xl skeleton-shimmer", `stagger-${i + 1}`)} />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <div className="text-center py-16 animate-fade-in">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Shops Available</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                There are no shops open right now. Check back later!
              </p>
              <Button variant="outline" onClick={handleRefresh} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map((shop, index) => (
                <div key={shop.id} className={cn("animate-fade-in-up", `stagger-${index + 1}`)}>
                  <ShopCard shop={shop} onClick={() => setSelectedShop(shop)} />
                </div>
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
      <header className="sticky top-0 bg-background/95 backdrop-blur-lg border-b border-border z-40 px-4 py-3 safe-area-top">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setSelectedShop(null)}
              className="min-w-[44px] min-h-[44px]"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-bold text-foreground">{selectedShop.shop_name}</h1>
              <p className={cn(
                "text-xs",
                selectedShop.is_open ? "text-success" : "text-destructive"
              )}>
                {selectedShop.is_open ? '● Open' : '● Closed'}
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
          <Input 
            placeholder="Search food..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            className="pl-10 h-11 rounded-xl"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none -mx-4 px-4">
          {categories.map((cat) => (
            <Badge 
              key={cat} 
              variant={category === cat ? 'default' : 'secondary'} 
              className={cn(
                "cursor-pointer capitalize whitespace-nowrap px-4 py-2 text-sm transition-all duration-200 touch-feedback",
                category === cat && "shadow-md"
              )}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Menu Grid */}
        {menuLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className={cn("h-48 rounded-xl skeleton-shimmer", `stagger-${i + 1}`)} />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-2">
              {debouncedSearch ? `No results for "${debouncedSearch}"` : 'No items in this category'}
            </h3>
            <p className="text-muted-foreground text-sm">
              {debouncedSearch ? 'Try a different search term' : 'Try selecting another category'}
            </p>
            {(debouncedSearch || category !== 'all') && (
              <Button 
                variant="outline" 
                onClick={() => { setSearch(''); setCategory('all'); }}
                className="mt-4"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map((item, index) => (
              <div key={item.id} className={cn("animate-fade-in-up", `stagger-${(index % 6) + 1}`)}>
                <MenuItemCard item={item} disabled={!selectedShop.is_open} shopId={selectedShop.id} />
              </div>
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
