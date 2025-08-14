import React, { Suspense, lazy, useEffect } from "react";
import { ConsolidatedToaster } from "@/components/ui/toast-consolidated";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { StoreProvider } from "./store/useAppStore";
import { OnboardingProvider } from "@/components/Onboarding/OnboardingProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import { GlobalLoadingIndicator } from "@/components/ui/global-loading";
import { ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";

import { AuthKernel } from "@/auth/AuthKernel";
import { AuthBoundary, RequireAuth, PublicOnly } from "@/auth/AuthBoundary";
import AuthErrorBoundary from "@/auth/AuthErrorBoundary";
import { QueryClientIntegration } from "@/auth/QueryClientIntegration";
import { BusinessSync } from "@/components/Business/BusinessSync";
import ClerkBootstrap from "@/components/Auth/ClerkBootstrap";
const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const QuotesPage = lazy(() => import("./pages/Quotes"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LegalPage = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/Landing"));

const ClerkAuthPage = lazy(() => import("./pages/ClerkAuth"));
const QuoteActionPage = lazy(() => import("./pages/QuoteAction"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceledPage = lazy(() => import("./pages/PaymentCanceled"));
const InvoicePayPage = lazy(() => import("./pages/InvoicePay"));
const InviteAcceptPage = lazy(() => import("./pages/InviteAccept"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes  
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= 3) return false;
        return !error?.message?.includes('401');
      }
    }
  }
});

// Clear query cache on auth state changes
queryClient.getQueryCache().subscribe(({ query, type }) => {
  // This will be enhanced once AuthKernel is integrated
  if (type === 'removed') {
    // Optional: track removed queries
  }
});

function PrefetchRoutes() {
  useEffect(() => {
    void Promise.all([
      import("./pages/Calendar"),
      import("./pages/WorkOrders"),
      import("./pages/Quotes"),
      import("./pages/Invoices"),
      import("./pages/Customers"),
      import("./pages/Settings"),
      import("./pages/Legal"),
      import("./pages/NotFound"),
      import("./pages/ClerkAuth"),
      import("./pages/QuoteAction"),
      import("./pages/PaymentSuccess"),
      import("./pages/PaymentCanceled"),
      import("./pages/InvoicePay"),
      import("./pages/InviteAccept"),
    ]);
  }, []);
  return null;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ConsolidatedToaster />
      <StoreProvider>
        <ClerkLoaded>
          <AuthKernel>
            <ClerkBootstrap />
            <BusinessSync />
            <GlobalLoadingIndicator />
            <QueryClientIntegration />
            <AuthErrorBoundary>
              <BrowserRouter>
                <OnboardingProvider>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingScreen />}>
                      <PrefetchRoutes />
                      <Routes>
                        {/* Public routes */}
                        <Route element={<PublicOnly redirectTo="/calendar" />}>
                          <Route path="/" element={<LandingPage />} />
                        </Route>
                        
                        {/* Protected routes */}
                        <Route element={<RequireAuth />}>
                          <Route path="/calendar" element={<CalendarPage />} />
                          <Route path="/work-orders" element={<WorkOrdersPage />} />
                          <Route path="/quotes" element={<QuotesPage />} />
                          <Route path="/invoices" element={<InvoicesPage />} />
                          <Route path="/customers" element={<CustomersPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/legal" element={<LegalPage />} />
                        </Route>

                        {/* Public pages that don't require auth checks */}
                        <Route path="/clerk-auth" element={<ClerkAuthPage />} />
                        <Route path="/quote-action" element={<QuoteActionPage />} />
                        <Route path="/payment-success" element={<PaymentSuccessPage />} />
                        <Route path="/payment-canceled" element={<PaymentCanceledPage />} />
                        <Route path="/invoice-pay" element={<InvoicePayPage />} />
                        <Route path="/invite" element={<InviteAcceptPage />} />
                        
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </OnboardingProvider>
              </BrowserRouter>
            </AuthErrorBoundary>
          </AuthKernel>
        </ClerkLoaded>
        <ClerkLoading>
          <LoadingScreen full />
        </ClerkLoading>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;