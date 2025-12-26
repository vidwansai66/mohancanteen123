import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

import AuthPage from '@/pages/Auth';
import RoleSelection from '@/pages/RoleSelection';
import StudentHome from '@/pages/student/Home';
import StudentOrders from '@/pages/student/Orders';
import ShopkeeperDashboard from '@/pages/shopkeeper/Dashboard';
import ShopkeeperMenu from '@/pages/shopkeeper/Menu';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut><RedirectToSignIn /></SignedOut>
    </>
  );
}

function RoleBasedRedirect() {
  const { role, isLoading } = useUserRole();
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!role) return <Navigate to="/role-selection" replace />;
  return <Navigate to={role === 'shopkeeper' ? '/shopkeeper' : '/student'} replace />;
}

const App = () => (
  <ClerkProvider publishableKey={clerkPubKey}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth/*" element={<AuthPage />} />
            <Route path="/role-selection" element={<ProtectedRoute><RoleSelection /></ProtectedRoute>} />
            <Route path="/student" element={<ProtectedRoute><StudentHome /></ProtectedRoute>} />
            <Route path="/student/orders" element={<ProtectedRoute><StudentOrders /></ProtectedRoute>} />
            <Route path="/shopkeeper" element={<ProtectedRoute><ShopkeeperDashboard /></ProtectedRoute>} />
            <Route path="/shopkeeper/menu" element={<ProtectedRoute><ShopkeeperMenu /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><RoleBasedRedirect /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>
);

export default App;
