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

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  
  // Onboarding system
  const onboardingState = useOnboardingState();
  const onboardingActions = useOnboardingActions();
  
  // Show intent picker modal for new users
  useEffect(() => {
    if (onboardingState.showIntentPicker && !showIntentPicker) {
      setShowIntentPicker(true);
    }
  }, [onboardingState.showIntentPicker, showIntentPicker]);

  const handleOpenHelp = () => {
    setShowIntentPicker(true);
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
            <h1 className="text-xl md:text-2xl font-bold">{title ?? 'Dashboard'}</h1>
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
        onOpenChange={setShowIntentPicker}
        onScheduleJob={onboardingActions.openNewJobSheet}
        onCreateQuote={onboardingActions.openCreateQuote}
        onAddCustomer={onboardingActions.openAddCustomer}
        onImportCustomers={onboardingActions.openImportCustomers}
        onSetupProfile={onboardingActions.openSetupProfile}
        onLinkBank={onboardingActions.openBankLink}
        onStartSubscription={onboardingActions.openSubscription}
      />
      
      <HelpWidget onOpenHelp={handleOpenHelp} />
    </SidebarProvider>
  );
}
