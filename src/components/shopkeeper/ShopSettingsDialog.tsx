import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shop } from '@/hooks/useShops';

interface ShopSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: Shop | null;
  onUpdate: (updates: Partial<Pick<Shop, 'shop_name' | 'upi_id' | 'upi_name'>>) => Promise<boolean>;
}

const ShopSettingsDialog = ({ open, onOpenChange, shop, onUpdate }: ShopSettingsDialogProps) => {
  const { toast } = useToast();
  const [form, setForm] = useState({
    shop_name: '',
    upi_id: '',
    upi_name: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (shop) {
      setForm({
        shop_name: shop.shop_name || '',
        upi_id: shop.upi_id || '',
        upi_name: shop.upi_name || '',
      });
    }
  }, [shop]);

  const handleSubmit = async () => {
    if (!form.shop_name.trim()) {
      toast({ title: 'Shop name is required', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    const success = await onUpdate({
      shop_name: form.shop_name.trim(),
      upi_id: form.upi_id.trim() || null,
      upi_name: form.upi_name.trim() || null,
    });

    if (success) {
      toast({ title: 'Shop settings updated' });
      onOpenChange(false);
    } else {
      toast({ title: 'Failed to update settings', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Shop Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div>
            <Label>Shop Name *</Label>
            <Input
              value={form.shop_name}
              onChange={(e) => setForm({ ...form, shop_name: e.target.value })}
              placeholder="My Canteen"
            />
          </div>
          <div>
            <Label>UPI ID</Label>
            <Input
              value={form.upi_id}
              onChange={(e) => setForm({ ...form, upi_id: e.target.value })}
              placeholder="yourname@upi"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Students will pay to this UPI ID
            </p>
          </div>
          <div>
            <Label>UPI Name</Label>
            <Input
              value={form.upi_name}
              onChange={(e) => setForm({ ...form, upi_name: e.target.value })}
              placeholder="Your Name"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Name shown to students during payment
            </p>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShopSettingsDialog;
