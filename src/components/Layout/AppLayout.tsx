import { ReactNode, useEffect, useState } from 'react';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { PageFade } from '@/components/Motion/PageFade';
import { SubscriptionBanner } from '@/components/Onboarding/SubscriptionBanner';
import { HelpWidget } from '@/components/Onboarding/HelpWidget';
import { IntentPickerModal } from '@/components/Onboarding/IntentPickerModal';
import { useOnboardingState } from '@/onboarding/streamlined';
import { useOnboardingActions } from '@/onboarding/hooks';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { RoleIndicator } from '@/components/Layout/RoleIndicator';

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  
  // Session-based dismissal state for intent picker modal
  const [intentPickerDismissed, setIntentPickerDismissed] = useSessionStorage('intentPickerDismissed', false);
  
  // Onboarding system
  const onboardingState = useOnboardingState();
  const onboardingActions = useOnboardingActions();
  
  // Show intent picker modal for new users, but respect session dismissal
  useEffect(() => {
    if (onboardingState.showIntentPicker && !intentPickerDismissed && !showIntentPicker) {
      setShowIntentPicker(true);
    }
  }, [onboardingState.showIntentPicker, intentPickerDismissed, showIntentPicker]);

  // Reset dismissal state when profile becomes complete
  useEffect(() => {
    if (onboardingState.profileComplete && intentPickerDismissed) {
      setIntentPickerDismissed(false);
    }
  }, [onboardingState.profileComplete, intentPickerDismissed, setIntentPickerDismissed]);

  const handleOpenHelp = () => {
    setShowIntentPicker(true);
  };

  const handleIntentPickerClose = (open: boolean) => {
    setShowIntentPicker(open);
    if (!open && onboardingState.showIntentPicker) {
      // Mark as dismissed for this session when user closes it
      setIntentPickerDismissed(true);
    }
  };

  useEffect(() => {
    document.title = title ? `${title} • ServiceGrid` : 'ServiceGrid';
  }, [title]);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0">
          <SubscriptionBanner />
          <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
          <header className="mb-4 md:mb-6">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-bold">{title ?? 'Dashboard'}</h1>
              <RoleIndicator size="default" />
            </div>
          </header>
          <div className="flex-1">
            <PageFade key={String(title)}>
              {children}
            </PageFade>
          </div>
          </div>
        </SidebarInset>
      </div>

      {/* Onboarding Components */}
      <IntentPickerModal
        open={showIntentPicker}
        onOpenChange={handleIntentPickerClose}
        onScheduleJob={onboardingActions.openNewJobSheet}
        onCreateQuote={onboardingActions.openCreateQuote}
        onAddCustomer={onboardingActions.openAddCustomer}
        onImportCustomers={onboardingActions.openImportCustomers}
        onSetupProfile={onboardingActions.openSetupProfile}
        onLinkBank={onboardingActions.openBankLink}
        onStartSubscription={onboardingActions.openSubscription}
        onSendInvoice={onboardingActions.openSendInvoice}
      />
      
      <HelpWidget onOpenHelp={handleOpenHelp} />
    </SidebarProvider>
  );
}
