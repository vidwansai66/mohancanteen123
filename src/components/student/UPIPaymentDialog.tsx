import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Order } from '@/hooks/useOrders';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Upload, Check, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface UPIPaymentDialogProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentSubmitted: () => void;
}

const UPI_ID = 'vidwan@fam';
const UPI_NAME = 'BACCHU SAI VIDWAN';

const UPIPaymentDialog = ({ order, open, onOpenChange, onPaymentSubmitted }: UPIPaymentDialogProps) => {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [step, setStep] = useState<'pay' | 'verify'>('pay');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!order) return null;

  const amount = Number(order.total).toFixed(2);
  const orderId = order.id.slice(0, 8).toUpperCase();
  const transactionNote = `Order #${orderId}`;

  // UPI deep link format
  const upiLink = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&tn=${encodeURIComponent(transactionNote)}&cu=INR`;

  const handleOpenUPI = () => {
    window.location.href = upiLink;
    // After redirecting, move to verification step
    setTimeout(() => setStep('verify'), 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
    }
  };

  const handleSubmitVerification = async () => {
    if (!screenshotFile) {
      toast({ title: 'Please upload payment screenshot', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let screenshotUrl: string | null = null;

      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `${order.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, screenshotFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-screenshots')
        .getPublicUrl(fileName);

      screenshotUrl = urlData.publicUrl;

      // Update order with payment proof - payment_status stays 'unpaid' until shopkeeper verifies
      const { error } = await supabase
        .from('orders')
        .update({
          payment_screenshot_url: screenshotUrl,
          utr_number: null,
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({ title: 'Screenshot submitted. Waiting for shopkeeper to verify.' });
      onPaymentSubmitted();
      onOpenChange(false);
      setStep('pay');
      setScreenshotFile(null);
    } catch (error) {
      console.error('Error submitting payment:', error);
      toast({
        title: 'Failed to submit payment',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('pay');
    setScreenshotFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay ₹{Number(order.total).toFixed(0)}</DialogTitle>
          <DialogDescription>Order #{orderId}</DialogDescription>
        </DialogHeader>

        {step === 'pay' ? (
          <div className="space-y-4">
            {isMobile ? (
              <>
                <p className="text-sm text-muted-foreground text-center">
                  Tap below to open your UPI app and complete payment
                </p>
                <Button onClick={handleOpenUPI} className="w-full" size="lg">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Pay with UPI App
                </Button>
                <Button variant="outline" onClick={() => setStep('verify')} className="w-full">
                  I've already paid
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Scan this QR code with any UPI app
                  </p>
                  <div className="bg-white p-4 rounded-lg">
                    <QRCodeSVG value={upiLink} size={200} />
                  </div>
                  <div className="text-center text-sm">
                    <p className="font-medium">{UPI_NAME}</p>
                    <p className="text-muted-foreground">{UPI_ID}</p>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setStep('verify')} className="w-full">
                  <Check className="w-4 h-4 mr-2" />
                  I've completed payment
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload your payment screenshot so the shopkeeper can verify the payment.
            </p>

            <div className="space-y-2">
              <Label htmlFor="screenshot">Payment Screenshot</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                <input
                  type="file"
                  id="screenshot"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="screenshot" className="cursor-pointer">
                  {screenshotFile ? (
                    <div className="flex items-center justify-center gap-2 text-primary">
                      <Check className="w-5 h-5" />
                      <span className="text-sm">{screenshotFile.name}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Upload className="w-8 h-8" />
                      <span className="text-sm">Tap to upload screenshot</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('pay')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleSubmitVerification}
                disabled={isSubmitting || !screenshotFile}
                className="flex-1"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default UPIPaymentDialog;