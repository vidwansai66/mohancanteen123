import { Home, ClipboardList, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useCartStore } from '@/stores/cartStore';
import { ShoppingCart } from 'lucide-react';

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
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Cart Button */}
        <button
          onClick={onCartClick}
          className="relative flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1 right-2 w-5 h-5 bg-primary text-primary-foreground text-xs rounded-full flex items-center justify-center font-bold">
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
