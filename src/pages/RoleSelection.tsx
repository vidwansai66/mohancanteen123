import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UtensilsCrossed, GraduationCap, Store, ArrowLeft, Loader2, Mail, KeyRound } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseWithClerk } from '@/hooks/useSupabaseWithClerk';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

type Step = 'select' | 'verify' | 'shop-setup';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const { role, setUserRole } = useUserRole();
  const { toast } = useToast();
  const supabaseWithClerk = useSupabaseWithClerk();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>('select');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [shopName, setShopName] = useState('');

  // If already has a role, redirect
  if (role) {
    return <Navigate to={role === 'shopkeeper' ? '/shopkeeper' : '/student'} replace />;
  }

  const handleStudentSelect = async () => {
    setIsLoading(true);
    const success = await setUserRole('student');
    if (success) {
      toast({
        title: "Welcome, Student!",
        description: "You can now browse the menu and place orders.",
      });
      navigate('/student');
    } else {
      toast({
        title: "Error",
        description: "Failed to set your role. Please try again.",
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleShopkeeperSelect = () => {
    setStep('verify');
  };

  const handleSendCode = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-shopkeeper-verification', {
        body: {
          userId: user.id,
          userEmail: user.primaryEmailAddress?.emailAddress || 'unknown',
        },
      });

      if (error) throw error;

      setCodeSent(true);
      toast({
        title: "Verification Code Sent",
        description: "A code has been sent to the developer. Please ask them for the code.",
      });
    } catch (error: any) {
      console.error('Error sending code:', error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!user || verificationCode.length !== 6) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-shopkeeper-code', {
        body: {
          userId: user.id,
          code: verificationCode,
        },
      });

      if (error) throw error;

      if (data?.valid) {
        // Move to shop setup step
        setStep('shop-setup');
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect or has expired.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      toast({
        title: "Error",
        description: "Failed to verify code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShop = async () => {
    if (!user || !shopName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a shop name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Create the shop first using authenticated client
      const { error: shopError } = await supabaseWithClerk
        .from('shops')
        .insert({
          owner_user_id: user.id,
          shop_name: shopName.trim(),
        });

      if (shopError) throw shopError;

      // Then set the user role
      const success = await setUserRole('shopkeeper');
      if (success) {
        toast({
          title: "Welcome, Shopkeeper!",
          description: "Your shop has been created. You can now manage your canteen.",
        });
        navigate('/shopkeeper');
      } else {
        toast({
          title: "Error",
          description: "Failed to set your role. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Error creating shop:', error);
      toast({
        title: "Error",
        description: "Failed to create shop. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'shop-setup') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => setStep('verify')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Store className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Create Your Shop</CardTitle>
              <CardDescription>
                Enter your shop name to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Shop Name *</Label>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="My Canteen"
                  className="mt-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={handleCreateShop}
                disabled={isLoading || !shopName.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Shop & Continue'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => {
              setStep('select');
              setCodeSent(false);
              setVerificationCode('');
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card>
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Shopkeeper Verification</CardTitle>
              <CardDescription>
                Developer permission is required to access shopkeeper features.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!codeSent ? (
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    <Mail className="w-5 h-5 inline-block mr-2" />
                    A verification code will be sent to the developer for approval.
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSendCode}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Request Verification Code'
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center text-sm text-muted-foreground">
                    Enter the 6-digit code provided by the developer.
                  </div>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={verificationCode}
                      onChange={(value) => setVerificationCode(value)}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleVerifyCode}
                    disabled={isLoading || verificationCode.length !== 6}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify & Continue'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleSendCode}
                    disabled={isLoading}
                  >
                    Resend Code
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Welcome to Campus Canteen</h1>
        <p className="text-muted-foreground mt-1">How would you like to use this app?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Card 
          className="cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          onClick={() => !isLoading && handleStudentSelect()}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>I'm a Student</CardTitle>
            <CardDescription>
              Browse menu, place orders, and track your food
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Continue as Student
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          onClick={() => !isLoading && handleShopkeeperSelect()}
        >
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Store className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>I'm a Shopkeeper</CardTitle>
            <CardDescription>
              Manage menu, accept orders, and run your canteen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              disabled={isLoading}
            >
              Continue as Shopkeeper
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelection;
