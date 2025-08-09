
import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { StoreProvider } from "./store/useAppStore";
import ErrorBoundary from "@/components/ErrorBoundary";
import LoadingScreen from "@/components/LoadingScreen";
import AuthProvider from "@/components/Auth/AuthProvider";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";

const CalendarPage = lazy(() => import("./pages/Calendar"));
const WorkOrdersPage = lazy(() => import("./pages/WorkOrders"));
const EstimatesPage = lazy(() => import("./pages/Estimates"));
const InvoicesPage = lazy(() => import("./pages/Invoices"));
const CustomersPage = lazy(() => import("./pages/Customers"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AuthPage = lazy(() => import("./pages/Auth"));

const AuthResetPage = lazy(() => import("./pages/AuthReset"));
const UpdatePasswordPage = lazy(() => import("./pages/UpdatePassword"));
const ClerkAuthPage = lazy(() => import("./pages/ClerkAuth"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <StoreProvider>
        <AuthProvider>
          <BrowserRouter>
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen /> }>
                 <Routes>
                   <Route path="/auth" element={<Navigate to="/clerk-auth" replace />} />
                   <Route path="/auth/reset" element={<AuthResetPage />} />
                   <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
                   <Route path="/clerk-auth" element={<ClerkAuthPage />} />
                   <Route path="/" element={<Navigate to="/calendar" replace />} />
                   {/* Public quote view - do not wrap with ProtectedRoute */}
                   <Route path="/c/:slug/q/:token" element={React.createElement(lazy(() => import("./pages/PublicQuote")))} />
                   <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
                   <Route path="/work-orders" element={<ProtectedRoute><WorkOrdersPage /></ProtectedRoute>} />
                   <Route path="/estimates" element={<ProtectedRoute><EstimatesPage /></ProtectedRoute>} />
                   <Route path="/invoices" element={<ProtectedRoute><InvoicesPage /></ProtectedRoute>} />
                   <Route path="/customers" element={<ProtectedRoute><CustomersPage /></ProtectedRoute>} />
                   <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                   <Route path="*" element={<NotFound />} />
                 </Routes>
              </Suspense>
            </ErrorBoundary>
          </BrowserRouter>
        </AuthProvider>
      </StoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
