import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Store, UtensilsCrossed } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const RoleSelection = () => {
  const navigate = useNavigate();
  const { setUserRole, role } = useUserRole();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // If already has role, redirect
  if (role) {
    navigate(role === 'shopkeeper' ? '/shopkeeper' : '/student');
    return null;
  }

  const handleRoleSelect = async (selectedRole: 'student' | 'shopkeeper') => {
    setIsLoading(true);
    const success = await setUserRole(selectedRole);
    
    if (success) {
      toast({
        title: 'Welcome!',
        description: `You're now registered as a ${selectedRole}.`,
      });
      navigate(selectedRole === 'shopkeeper' ? '/shopkeeper' : '/student');
    } else {
      toast({
        title: 'Error',
        description: 'Failed to set role. Please try again.',
        variant: 'destructive',
      });
    }
    setIsLoading(false);
  };

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
          onClick={() => !isLoading && handleRoleSelect('student')}
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
              Continue as Student
            </Button>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:border-primary hover:shadow-lg hover:shadow-primary/10"
          onClick={() => !isLoading && handleRoleSelect('shopkeeper')}
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
