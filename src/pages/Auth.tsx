import { SignIn, SignUp } from '@clerk/clerk-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get('mode') || 'sign-in';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Campus Canteen</h1>
        <p className="text-muted-foreground mt-1">Order food from your campus canteen</p>
      </div>

      <div className="w-full max-w-md">
        {mode === 'sign-up' ? (
          <SignUp
            routing="path"
            path="/auth"
            signInUrl="/auth?mode=sign-in"
            afterSignUpUrl="/role-selection"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-card border border-border shadow-xl',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted-foreground',
                formButtonPrimary: 'bg-primary hover:bg-primary/90',
                formFieldInput: 'bg-secondary border-border text-foreground',
                formFieldLabel: 'text-foreground',
                footerActionLink: 'text-primary hover:text-primary/80',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                socialButtonsBlockButton: 'bg-secondary border-border text-foreground hover:bg-muted',
              },
            }}
          />
        ) : (
          <SignIn
            routing="path"
            path="/auth"
            signUpUrl="/auth?mode=sign-up"
            afterSignInUrl="/"
            appearance={{
              elements: {
                rootBox: 'w-full',
                card: 'bg-card border border-border shadow-xl',
                headerTitle: 'text-foreground',
                headerSubtitle: 'text-muted-foreground',
                formButtonPrimary: 'bg-primary hover:bg-primary/90',
                formFieldInput: 'bg-secondary border-border text-foreground',
                formFieldLabel: 'text-foreground',
                footerActionLink: 'text-primary hover:text-primary/80',
                dividerLine: 'bg-border',
                dividerText: 'text-muted-foreground',
                socialButtonsBlockButton: 'bg-secondary border-border text-foreground hover:bg-muted',
              },
            }}
          />
        )}
      </div>

      <div className="mt-6">
        <Button
          variant="ghost"
          onClick={() => navigate(mode === 'sign-in' ? '/auth?mode=sign-up' : '/auth?mode=sign-in')}
          className="text-muted-foreground hover:text-foreground"
        >
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </Button>
      </div>
    </div>
  );
};

export default AuthPage;
