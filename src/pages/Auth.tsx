import { SignIn, SignUp } from '@clerk/clerk-react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed } from 'lucide-react';

const authAppearance = {
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

    // Hide Clerk branding/footer (if present for your plan)
    footer: 'hidden',
    poweredBy: 'hidden',
  },
} as const;

const AuthPage = () => {
  const { pathname } = useLocation();

  // Normalize /auth to /auth/sign-in to avoid route churn/refresh loops
  if (pathname === '/auth' || pathname === '/auth/') {
    return <Navigate to="/auth/sign-in" replace />;
  }

  const isSignUp = pathname.startsWith('/auth/sign-up');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
            <UtensilsCrossed className="w-7 h-7 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Preorder</h1>
        <p className="text-muted-foreground mt-1">Order food in advance</p>
      </header>

      <section className="w-full max-w-md" aria-label={isSignUp ? 'Sign up' : 'Sign in'}>
        {isSignUp ? (
          <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl="/auth/sign-in"
            afterSignUpUrl="/role-selection"
            appearance={authAppearance}
          />
        ) : (
          <SignIn
            routing="path"
            path="/auth/sign-in"
            signUpUrl="/auth/sign-up"
            afterSignInUrl="/"
            appearance={authAppearance}
          />
        )}
      </section>

      <footer className="mt-6">
        <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
          <Link to={isSignUp ? '/auth/sign-in' : '/auth/sign-up'}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </Link>
        </Button>
      </footer>
    </main>
  );
};

export default AuthPage;
