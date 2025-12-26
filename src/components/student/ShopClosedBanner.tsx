import { AlertTriangle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface ShopClosedBannerProps {
  reopenTime: string | null;
}

const ShopClosedBanner = ({ reopenTime }: ShopClosedBannerProps) => {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Shop is Currently Closed</h3>
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
        </div>
      </div>
    </div>
  );
};

export default ShopClosedBanner;
