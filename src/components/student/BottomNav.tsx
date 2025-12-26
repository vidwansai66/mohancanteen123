import { Home, ClipboardList, Heart, ShoppingCart } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';

interface BottomNavProps {
  onCartClick: () => void;
}

const BottomNav = ({ onCartClick }: BottomNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const totalItems = useCartStore((state) => state.getTotalItems());

  const navItems = [
    { icon: Home, label: 'Home', path: '/student' },
    { icon: ClipboardList, label: 'Orders', path: '/student/orders' },
    { icon: Heart, label: 'Favourites', path: '/student/favourites' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all duration-200 min-w-[60px] min-h-[48px] touch-feedback',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className={cn(
                'w-5 h-5 transition-transform duration-200',
                isActive && 'scale-110'
              )} />
              <span className={cn(
                'text-xs font-medium transition-all duration-200',
                isActive && 'font-semibold'
              )}>{item.label}</span>
            </button>
          );
        })}

        {/* Cart Button */}
        <button
          onClick={onCartClick}
          className="relative flex flex-col items-center gap-1 py-2 px-4 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200 min-w-[60px] min-h-[48px] touch-feedback"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 right-1 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold animate-bounce-in shadow-lg">
              {totalItems > 9 ? '9+' : totalItems}
            </span>
          )}
          <span className="text-xs font-medium">Cart</span>
        </button>
      </div>
    </div>
  );
};

export default BottomNav;
