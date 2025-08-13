
import React, { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./store/useAppStore";
import { OnboardingProvider } from "@/components/Onboarding/OnboardingProvider";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";

import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import AutoSignOut from "@/components/Auth/AutoSignOut";
import ClerkBootstrap from "@/components/Auth/ClerkBootstrap";
const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const QuotesPage = lazy(() => import("./pages/Quotes"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LegalPage = lazy(() => import("./pages/Legal"));
const NotFound = lazy(() => import("./pages/NotFound"));
import LandingPage from "./pages/Landing";

const ClerkAuthPage = lazy(() => import("./pages/ClerkAuth"));
const QuoteActionPage = lazy(() => import("./pages/QuoteAction"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceledPage = lazy(() => import("./pages/PaymentCanceled"));
const InvoicePayPage = lazy(() => import("./pages/InvoicePay"));

const queryClient = new QueryClient();

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
    ]);
  }, []);
  return null;
}


const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AutoSignOut />
      <ClerkBootstrap />
      <StoreProvider>
        <BrowserRouter>
          <OnboardingProvider>
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen /> }>
                 <PrefetchRoutes />
                 <Routes>
                   <Route path="/clerk-auth" element={<ClerkAuthPage />} />
                   <Route path="/quote-action" element={<QuoteActionPage />} />
                   
                   <Route path="/" element={<LandingPage />} />
                   <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                   <Route path="/work-orders" element={<ProtectedRoute><WorkOrdersPage /></ProtectedRoute>} />
                   <Route path="/quotes" element={<ProtectedRoute><QuotesPage /></ProtectedRoute>} />
                   <Route path="/estimates" element={<Navigate to="/quotes" replace />} />
                    <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
                    <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                    <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                    <Route path="/legal" element={<ProtectedRoute><LegalPage /></ProtectedRoute>} />
                    <Route path="/payment-success" element={<PaymentSuccessPage />} />
                    <Route path="/payment-canceled" element={<PaymentCanceledPage />} />
                    <Route path="/invoice-pay" element={<InvoicePayPage />} />
                   <Route path="*" element={<NotFound />} />
                 </Routes>
              </Suspense>
            </ErrorBoundary>
          </OnboardingProvider>
        </BrowserRouter>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
