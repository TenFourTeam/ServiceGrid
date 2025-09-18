import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider, ClerkLoaded, ClerkLoading } from "@clerk/clerk-react";
import { AppProviders } from "@/providers/AppProviders";

import { AuthBoundary, RequireAuth, PublicOnly, QueryClientClerkIntegration } from "@/auth";
import { RequireRole } from "@/components/Auth/RequireRole";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";

const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const QuotesPage = lazy(() => import("./pages/Quotes"));
const RequestsPage = lazy(() => import("./pages/Requests"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LegalPage = lazy(() => import("./pages/Legal"));
const LegalDocument = lazy(() => import("./components/Legal/LegalDocument"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/Landing"));
const TeamPage = lazy(() => import("./pages/Team"));
const TimesheetPage = lazy(() => import("./pages/Timesheet"));
const MemberTimesheetPage = lazy(() => import("./pages/MemberTimesheet"));
const ReferralPage = lazy(() => import("./pages/Referral"));

const ClerkAuthPage = lazy(() => import("./pages/ClerkAuth"));
const QuoteActionPage = lazy(() => import("./pages/QuoteAction"));
const QuoteViewerPage = lazy(() => import("./pages/QuoteViewer"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceledPage = lazy(() => import("./pages/PaymentCanceled"));
const InvoicePayPage = lazy(() => import("./pages/InvoicePay"));
const InvitePage = lazy(() => import("./pages/Invite"));
const PublicRequestFormPage = lazy(() => import("./pages/PublicRequestForm"));

function PrefetchRoutes() {
  useEffect(() => {
    void Promise.all([
      import("./pages/Calendar"),
      import("./pages/WorkOrders"),
      import("./pages/Quotes"),
      import("./pages/Requests"),
      import("./pages/Invoices"),
      import("./pages/Customers"),
      import("./pages/Settings"),
      import("./pages/Legal"),
      import("./components/Legal/LegalDocument"),
      import("./pages/Team"),
      import("./pages/Timesheet"),
      import("./pages/Referral"),
      import("./pages/NotFound"),
      import("./pages/ClerkAuth"),
      import("./pages/QuoteAction"),
      import("./pages/QuoteViewer"),
      import("./pages/PaymentSuccess"),
      import("./pages/PaymentCanceled"),
      import("./pages/InvoicePay"),
      import("./pages/Invite"),
      import("./pages/PublicRequestForm"),
    ]);
  }, []);
  return null;
}

interface AppProps {
  clerkKey: string;
}

// Memoized App component to prevent unnecessary re-renders
const App = React.memo(({ clerkKey }: AppProps) => {
  const mountedRef = React.useRef(false);
  
  React.useEffect(() => {
    if (mountedRef.current) {
      console.warn('[App] Component remounting detected');
    }
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ClerkProvider 
      publishableKey={clerkKey}
    >
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
                  <Route path="/team/member/:userId" element={
                    <RequireRole role="owner">
                      <MemberTimesheetPage />
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
                  <Route path="/requests" element={
                    <RequireRole role="owner">
                      <RequestsPage />
                    </RequireRole>
                  } />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/referral" element={<ReferralPage />} />
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
                <Route path="/request/:businessId" element={<PublicRequestFormPage />} />
                
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
    </ClerkProvider>
  );
});

export default App;