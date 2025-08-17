import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import { AppProviders } from "@/providers/AppProviders";

import { AuthBoundary, RequireAuth, PublicOnly, QueryClientClerkIntegration } from "@/auth";
import { RequireRole } from "@/components/Auth/RequireRole";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";

const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const QuotesPage = lazy(() => import("./pages/Quotes"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LegalPage = lazy(() => import("./pages/Legal"));
const LegalDocument = lazy(() => import("./components/Legal/LegalDocument"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/Landing"));
const TeamPage = lazy(() => import("./pages/Team"));
const TimesheetPage = lazy(() => import("./pages/Timesheet"));

const ClerkAuthPage = lazy(() => import("./pages/ClerkAuth"));
const QuoteActionPage = lazy(() => import("./pages/QuoteAction"));
const QuoteViewerPage = lazy(() => import("./pages/QuoteViewer"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceledPage = lazy(() => import("./pages/PaymentCanceled"));
const InvoicePayPage = lazy(() => import("./pages/InvoicePay"));
const InvitePage = lazy(() => import("./pages/Invite"));

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
      import("./components/Legal/LegalDocument"),
      import("./pages/Team"),
      import("./pages/Timesheet"),
      import("./pages/NotFound"),
      import("./pages/ClerkAuth"),
      import("./pages/QuoteAction"),
      import("./pages/QuoteViewer"),
      import("./pages/PaymentSuccess"),
      import("./pages/PaymentCanceled"),
      import("./pages/InvoicePay"),
      import("./pages/Invite"),
    ]);
  }, []);
  return null;
}

const App = () => (
  <BrowserRouter>
    <ClerkLoaded>
      <AppProviders>
        <QueryClientClerkIntegration />
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
                {/* Routes accessible to both owners and workers */}
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/timesheet" element={<TimesheetPage />} />
                
                {/* Owner-only routes */}
                <Route path="/team" element={
                  <RequireRole role="owner">
                    <TeamPage />
                  </RequireRole>
                } />
                
                {/* Owner-only routes */}
                <Route path="/work-orders" element={
                  <RequireRole role="owner">
                    <WorkOrdersPage />
                  </RequireRole>
                } />
                <Route path="/quotes" element={
                  <RequireRole role="owner">
                    <QuotesPage />
                  </RequireRole>
                } />
                <Route path="/invoices" element={
                  <RequireRole role="owner">
                    <InvoicesPage />
                  </RequireRole>
                } />
                <Route path="/customers" element={
                  <RequireRole role="owner">
                    <CustomersPage />
                  </RequireRole>
                } />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="/legal/:slug" element={<LegalDocument />} />
              </Route>

              {/* Public pages that don't require auth checks */}
              <Route path="/clerk-auth" element={<ClerkAuthPage />} />
              <Route path="/quote-action" element={<QuoteActionPage />} />
              <Route path="/quote/:token" element={<QuoteViewerPage />} />
              <Route path="/payment-success" element={<PaymentSuccessPage />} />
              <Route path="/payment-canceled" element={<PaymentCanceledPage />} />
              <Route path="/invoice-pay" element={<InvoicePayPage />} />
              <Route path="/invite" element={<InvitePage />} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </AppProviders>
    </ClerkLoaded>
    <ClerkLoading>
      <LoadingScreen full />
    </ClerkLoading>
  </BrowserRouter>
);

export default App;