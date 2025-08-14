import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { AuthBoundary, RequireAuth, PublicOnly } from "@/auth/AuthBoundary";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import { OnboardingErrorBoundary } from "@/components/ErrorBoundaries/FeatureErrorBoundary";
// import ClerkBootstrap from "@/components/Auth/ClerkBootstrap"; // Temporarily disabled to prevent automatic profile creation
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

// Query client and prefetching moved to AppProviders

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
  <AppProviders>
    {/* <ClerkBootstrap /> */} {/* Temporarily disabled - use ManualBootstrap component instead */}
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
  </AppProviders>
);

export default App;