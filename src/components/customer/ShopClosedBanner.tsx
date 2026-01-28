import { AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ShopClosedBannerProps {
  reopenTime: string | null;
  message?: string;
}

const ShopClosedBanner = ({ reopenTime, message }: ShopClosedBannerProps) => {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 mb-4 animate-fade-in animate-sway origin-top">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-lg">Shop is Currently Closed</h3>
          {reopenTime ? (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Clock className="w-4 h-4" />
              Reopens at {format(new Date(reopenTime), 'h:mm a')}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground mt-1">
              Check back later for fresh food!
            </p>
          )}
          {message && (
            <p className="text-sm text-muted-foreground mt-2 italic">"{message}"</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShopClosedBanner;
