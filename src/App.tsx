import React, { Suspense, lazy, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { BusinessAuthProvider } from "@/providers/BusinessAuthProvider";
import { AppProviders } from "@/providers/AppProviders";
import { setBootStage } from "@/lib/boot-trace";
import { StallGuard } from "@/components/StallGuard";
import BootLoadingScreen from "@/components/BootLoadingScreen";

import { AuthBoundary, RequireAuth, PublicOnly, QueryClientAuthIntegration } from "@/auth";
import { RequireRole } from "@/components/Auth/RequireRole";
import ErrorBoundary from './components/ErrorBoundary';


const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const QuotesPage = lazy(() => import("./pages/Quotes"));
const RequestsPage = lazy(() => import("./pages/Requests"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const AnalyticsPage = lazy(() => import("./pages/Analytics"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const LegalPage = lazy(() => import("./pages/Legal"));
const LegalDocument = lazy(() => import("./components/Legal/LegalDocument"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import("./pages/Landing"));
const TeamPage = lazy(() => import("./pages/Team"));
const TimesheetPage = lazy(() => import("./pages/Timesheet"));
const MemberTimesheetPage = lazy(() => import("./pages/MemberTimesheet"));
const ReferralPage = lazy(() => import("./pages/Referral"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));

const AuthPage = lazy(() => import("./pages/Auth"));
const AuthConfirm = lazy(() => import("./pages/AuthConfirm"));
const MagicLinkVerify = lazy(() => import("./pages/MagicLinkVerify"));
const PasswordReset = lazy(() => import("./pages/PasswordReset"));
const QuoteActionPage = lazy(() => import("./pages/QuoteAction"));
const JobActionPage = lazy(() => import("./pages/JobAction"));
const QuoteViewerPage = lazy(() => import("./pages/QuoteViewer"));
const QuotePresentationPage = lazy(() => import("./pages/QuotePresentation"));
const QuoteEditFormPage = lazy(() => import("./pages/QuoteEditForm"));
const PaymentSuccessPage = lazy(() => import("./pages/PaymentSuccess"));
const PaymentCanceledPage = lazy(() => import("./pages/PaymentCanceled"));
const InvoicePayPage = lazy(() => import("./pages/InvoicePay"));
const InvitePage = lazy(() => import("./pages/Invite"));
const PublicRequestFormPage = lazy(() => import("./pages/PublicRequestForm"));
const IndustryResourcePage = lazy(() => import("./pages/IndustryResource"));
const RecurringJobsPage = lazy(() => import("./pages/RecurringJobs"));
const RoadmapPage = lazy(() => import("./pages/Roadmap"));
const ChangelogPage = lazy(() => import("./pages/Changelog"));
const PricingPage = lazy(() => import("./pages/Pricing"));
const BlogPage = lazy(() => import("./pages/Blog"));
const BlogPostPage = lazy(() => import("./pages/BlogPost"));
const GoogleDriveCallback = lazy(() => import("./pages/GoogleDriveCallback"));

// Customer Portal pages
const CustomerLogin = lazy(() => import("./pages/CustomerLogin"));
const CustomerMagicLink = lazy(() => import("./pages/CustomerMagicLink"));
const CustomerInviteAccept = lazy(() => import("./pages/CustomerInviteAccept"));

// Customer Portal components
import { CustomerAuthProvider, CustomerProtectedRoute, CustomerPortalLayout, CustomerDashboard, CustomerDocuments, CustomerSchedule, CustomerMessages, PasswordResetConfirm } from './components/CustomerPortal';


// Component to signal when app is ready
function AppReadySignal({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setBootStage('app_ready');
  }, []);
  return <>{children}</>;
}

// Component to signal route loading during Suspense
function RouteLoadingFallback() {
  useEffect(() => {
    setBootStage('route_loading');
  }, []);
  return <BootLoadingScreen fallbackLabel="Loading page" />;
}

// App component 
function App() {
  return (
    <StallGuard>
      <BrowserRouter>
        <BusinessAuthProvider>
          <AppProviders>
            <QueryClientAuthIntegration />
            <ErrorBoundary>
            <Suspense fallback={<RouteLoadingFallback />}>
              <AppReadySignal>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicOnly redirectTo="/calendar" />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/roadmap" element={<RoadmapPage />} />
              <Route path="/changelog" element={<ChangelogPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/:slug" element={<BlogPostPage />} />
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
              <Route path="/analytics" element={
                <RequireRole role="owner">
                  <AnalyticsPage />
                </RequireRole>
              } />
              <Route path="/recurring-jobs" element={
                <RequireRole role="owner">
                  <RecurringJobsPage />
                </RequireRole>
              } />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/referral" element={<ReferralPage />} />
              <Route path="/legal" element={<LegalPage />} />
              <Route path="/legal/:slug" element={<LegalDocument />} />
            </Route>

            {/* Public pages that don't require auth checks */}
            <Route path="/resources/:slug" element={<IndustryResourcePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />
            <Route path="/auth/verify/:token" element={<MagicLinkVerify />} />
            <Route path="/auth/reset/:token" element={<PasswordReset />} />
            <Route path="/quote-action" element={<QuoteActionPage />} />
            <Route path="/job-action" element={<JobActionPage />} />
            <Route path="/quote/:token" element={<QuoteViewerPage />} />
            <Route path="/quote-present/:token" element={<QuotePresentationPage />} />
            <Route path="/quote-edit/:quoteId/:token" element={<QuoteEditFormPage />} />
            <Route path="/payment-success" element={<PaymentSuccessPage />} />
            <Route path="/payment-canceled" element={<PaymentCanceledPage />} />
            <Route path="/invoice-pay" element={<InvoicePayPage />} />
            <Route path="/invite" element={<InvitePage />} />
            <Route path="/invite/referral" element={<ReferralLanding />} />
            <Route path="/request/:businessId" element={<PublicRequestFormPage />} />
            <Route path="/auth/google-drive/callback" element={<GoogleDriveCallback />} />
            
            {/* Customer Portal routes */}
            <Route path="/customer-login" element={<CustomerLogin />} />
            <Route path="/customer-invite/:token" element={<CustomerInviteAccept />} />
            <Route path="/customer-magic/:token" element={<CustomerMagicLink />} />
            <Route path="/customer-reset-password/:token" element={<PasswordResetConfirm />} />
            <Route path="/portal" element={
              <CustomerAuthProvider>
                <CustomerProtectedRoute>
                  <CustomerPortalLayout />
                </CustomerProtectedRoute>
              </CustomerAuthProvider>
            }>
              <Route index element={<CustomerDashboard />} />
              <Route path="documents" element={<CustomerDocuments />} />
              <Route path="schedule" element={<CustomerSchedule />} />
              <Route path="messages" element={<CustomerMessages />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
              </AppReadySignal>
              </Suspense>
            </ErrorBoundary>
        </AppProviders>
        </BusinessAuthProvider>
      </BrowserRouter>
    </StallGuard>
  );
}

export default App;
