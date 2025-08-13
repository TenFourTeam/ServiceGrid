import React, { createContext, useContext, useState } from 'react';
import { IntentPickerModal } from './IntentPickerModal';
import { useOnboardingState } from '@/hooks/useOnboardingState';
import { useNavigate } from 'react-router-dom';

interface OnboardingContextType {
  showIntentPicker: () => void;
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
  const { showIntentPicker: shouldShowIntentPicker } = useOnboardingState();
  const [intentPickerOpen, setIntentPickerOpen] = useState(false);

  // Auto-show intent picker for new users
  React.useEffect(() => {
    if (shouldShowIntentPicker) {
      // Small delay to avoid showing on initial page load
      const timer = setTimeout(() => {
        setIntentPickerOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowIntentPicker]);

  const openNewJobSheet = () => {
    // Trigger the NewJobSheet component that's already in AppLayout
    const newJobButton = document.querySelector('[data-testid="new-job-trigger"]') as HTMLButtonElement;
    newJobButton?.click();
  };

  const openCreateQuote = () => {
    navigate('/quotes?new=1');
  };

  const openAddCustomer = () => {
    navigate('/customers');
    // Small delay to allow navigation, then trigger new customer modal
    setTimeout(() => {
      const addCustomerButton = document.querySelector('button:has-text("New Customer")') as HTMLButtonElement;
      addCustomerButton?.click();
    }, 100);
  };

  const openImportCustomers = () => {
    // TODO: Implement CSV import functionality
    navigate('/customers');
  };

  const openBankLink = () => {
    navigate('/settings');
  };

  const openSubscription = () => {
    // TODO: Navigate to subscription page
    navigate('/settings');
  };

  const contextValue: OnboardingContextType = {
    showIntentPicker: () => setIntentPickerOpen(true),
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