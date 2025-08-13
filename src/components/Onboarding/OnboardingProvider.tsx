import React, { createContext, useContext, useState } from 'react';
import { IntentPickerModal } from './IntentPickerModal';
import { FloatingSetupWidget } from './FloatingSetupWidget';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useAnalytics } from '@/hooks/useAnalytics';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

interface OnboardingContextType {
  showIntentPicker: () => void;
  openSetupProfile: () => void;
  openNewJobSheet: () => void;
  openCreateQuote: () => void;
  openAddCustomer: () => void;
  openImportCustomers: () => void;
  openBankLink: () => void;
  openSubscription: () => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { isSignedIn } = useClerkAuth();
  const { showIntentPicker: shouldShowIntentPicker } = useOnboardingState({ enabled: isSignedIn });
  const [intentPickerOpen, setIntentPickerOpen] = useState(false);
  const { track } = useAnalytics();

  // Auto-show intent picker for new users, but only if signed in
  React.useEffect(() => {
    if (isSignedIn && shouldShowIntentPicker) {
      // Small delay to avoid showing on initial page load
      const timer = setTimeout(() => {
        setIntentPickerOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, shouldShowIntentPicker]);

  const openSetupProfile = () => {
    track('onboarding_step_completed', { step: 'setup_profile_initiated' });
    navigate('/settings');
  };

  const openNewJobSheet = () => {
    track('onboarding_step_completed', { step: 'new_job_initiated' });
    // Navigate to calendar which will show the empty state with job creation
    navigate('/');
  };

  const openCreateQuote = () => {
    track('onboarding_step_completed', { step: 'new_quote_initiated' });
    navigate('/quotes?new=1');
  };

  const openAddCustomer = () => {
    track('onboarding_step_completed', { step: 'add_customer_initiated' });
    navigate('/customers?new=1');
  };

  const openImportCustomers = () => {
    track('onboarding_step_completed', { step: 'csv_import_initiated' });
    setIntentPickerOpen(false);
    // This will be handled by the CSV import modal in the customers page
    navigate('/customers?import=1');
  };

  const openBankLink = () => {
    track('onboarding_step_completed', { step: 'bank_link_initiated' });
    navigate('/settings');
  };

  const openSubscription = () => {
    track('onboarding_step_completed', { step: 'subscription_initiated' });
    // TODO: Navigate to subscription page
    navigate('/settings');
  };

  const contextValue: OnboardingContextType = {
    showIntentPicker: () => setIntentPickerOpen(true),
    openSetupProfile,
    openNewJobSheet,
    openCreateQuote,
    openAddCustomer,
    openImportCustomers,
    openBankLink,
    openSubscription: openSubscription
  };

  return (
    <OnboardingContext.Provider value={contextValue}>
      {children}
      <IntentPickerModal
        open={intentPickerOpen}
        onOpenChange={setIntentPickerOpen}
        onScheduleJob={openNewJobSheet}
        onCreateQuote={openCreateQuote}
        onAddCustomer={openAddCustomer}
        onImportCustomers={openImportCustomers}
      />
      <FloatingSetupWidget
        onSetupProfile={openSetupProfile}
        onAddCustomer={openAddCustomer}
        onCreateJob={openNewJobSheet}
        onCreateQuote={openCreateQuote}
        onLinkBank={openBankLink}
        onStartSubscription={openSubscription}
      />
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}