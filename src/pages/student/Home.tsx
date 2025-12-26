import { useState } from 'react';
import { useUser, UserButton } from '@clerk/clerk-react';
import { useMenuItems } from '@/hooks/useMenuItems';
import { useShopStatus } from '@/hooks/useShopStatus';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UtensilsCrossed } from 'lucide-react';
import BottomNav from '@/components/student/BottomNav';
import MenuItemCard from '@/components/student/MenuItemCard';
import CartDrawer from '@/components/student/CartDrawer';
import ShopClosedBanner from '@/components/student/ShopClosedBanner';
import { Skeleton } from '@/components/ui/skeleton';

const categories = ['all', 'breakfast', 'lunch', 'snacks', 'drinks'] as const;

const StudentHome = () => {
  const { user } = useUser();
  const { menuItems, isLoading } = useMenuItems();
  const { shopStatus } = useShopStatus();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [cartOpen, setCartOpen] = useState(false);

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
          <UserButton afterSignOutUrl="/auth" />
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {shopStatus && !shopStatus.is_open && (
          <ShopClosedBanner reopenTime={shopStatus.reopen_time} />
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
        {isLoading ? (
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
              <MenuItemCard key={item.id} item={item} disabled={!shopStatus?.is_open} />
            ))}
          </div>
        )}
      </main>

      <BottomNav onCartClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} shopOpen={shopStatus?.is_open} />
    </div>
  );
};

export default StudentHome;
