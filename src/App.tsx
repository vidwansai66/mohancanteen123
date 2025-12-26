import { useEffect, useState } from "react";
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ExternalLink } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

import AuthPage from "@/pages/Auth";
import RoleSelection from "@/pages/RoleSelection";
import StudentHome from "@/pages/student/Home";
import StudentOrders from "@/pages/student/Orders";
import ShopkeeperDashboard from "@/pages/shopkeeper/Dashboard";
import ShopkeeperMenu from "@/pages/shopkeeper/Menu";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();
const clerkPubKeyFromEnv = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}

function RoleBasedRedirect() {
  const { role, isLoading } = useUserRole();
  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  if (!role) return <Navigate to="/role-selection" replace />;
  return <Navigate to={role === "shopkeeper" ? "/shopkeeper" : "/student"} replace />;
}

function MissingClerkKeyError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="w-6 h-6 text-warning" />
          </div>
          <CardTitle>Clerk Setup Required</CardTitle>
          <CardDescription>
            The Clerk publishable key is not configured (or couldn't be loaded). Please follow these steps:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Go to{" "}
              <a
                href="https://dashboard.clerk.com"
                target="_blank"
                rel="noopener"
                className="text-primary hover:underline"
              >
                Clerk Dashboard
              </a>
            </li>
            <li>Create a new application or select existing one</li>
            <li>
              Go to API Keys and copy your <strong>Publishable Key</strong>
            </li>
            <li>In Lovable, go to Settings → Secrets</li>
            <li>
              Update the <code className="bg-muted px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code> secret with your
              key
            </li>
          </ol>
          <Button className="w-full" asChild>
            <a href="https://dashboard.clerk.com/last-active?path=api-keys" target="_blank" rel="noopener">
              <ExternalLink className="w-4 h-4 mr-2" />
              Open Clerk Dashboard
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

const App = () => {
  const [clerkPubKey, setClerkPubKey] = useState<string | null>(clerkPubKeyFromEnv ?? null);
  const [isConfigLoading, setIsConfigLoading] = useState(!clerkPubKeyFromEnv);

  useEffect(() => {
    if (clerkPubKeyFromEnv) {
      setIsConfigLoading(false);
      return;
    }

    let cancelled = false;

    // Safety timeout: never keep the app stuck on a spinner.
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setClerkPubKey(null);
      setIsConfigLoading(false);
    }, 8000);

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("public-config");
        if (cancelled) return;

        window.clearTimeout(timeoutId);

        if (error) {
          setClerkPubKey(null);
          setIsConfigLoading(false);
          return;
        }

        const key = (data as any)?.clerkPublishableKey;
        setClerkPubKey(typeof key === "string" && key.length > 0 ? key : null);
        setIsConfigLoading(false);
      } catch {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setClerkPubKey(null);
        setIsConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  if (isConfigLoading) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  if (!clerkPubKey) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <MissingClerkKeyError />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth/*" element={<AuthPage />} />
              <Route
                path="/role-selection"
                element={
                  <ProtectedRoute>
                    <RoleSelection />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student"
                element={
                  <ProtectedRoute>
                    <StudentHome />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/orders"
                element={
                  <ProtectedRoute>
                    <StudentOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shopkeeper"
                element={
                  <ProtectedRoute>
                    <ShopkeeperDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shopkeeper/menu"
                element={
                  <ProtectedRoute>
                    <ShopkeeperMenu />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <RoleBasedRedirect />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
};

export default App;
