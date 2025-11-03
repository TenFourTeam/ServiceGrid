import { ReactNode, useEffect, useState } from 'react';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import MobileHeader from '@/components/Layout/MobileHeader';
import MobileNavigation from '@/components/Layout/MobileNavigation';

import { useBusinessContext } from '@/hooks/useBusinessContext';
import { PageFade } from '@/components/Motion/PageFade';
import { SubscriptionBanner } from '@/components/Onboarding/SubscriptionBanner';
import { HelpWidget } from '@/components/Onboarding/HelpWidget';
import { IntentPickerModal } from '@/components/Onboarding/IntentPickerModal';
import { useOnboardingState } from '@/onboarding/streamlined';
import { useOnboardingActions } from '@/onboarding/hooks';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { RoleIndicator } from '@/components/Layout/RoleIndicator';
import { BusinessSwitcher } from '@/components/Layout/BusinessSwitcher';
import { useIsMobile } from '@/hooks/use-mobile';
import { AIStatusBadge } from '@/components/AI/AIStatusBadge';
import { AskAIButton } from '@/components/AI/AskAIButton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

export default function AppLayout({ children, title, businessId }: { children: ReactNode; title?: string; businessId?: string }) {
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const isMobile = useIsMobile();
  const { role } = useBusinessContext(businessId);
  
  // Session-based dismissal state for intent picker modal
  const [intentPickerDismissed, setIntentPickerDismissed] = useSessionStorage('intentPickerDismissed', false);
  
  // AI onboarding tooltip state
  const [aiOnboardingSeen, setAiOnboardingSeen] = useSessionStorage('aiOnboardingSeen', false);
  const [showAiTooltip, setShowAiTooltip] = useState(false);

  // Show AI onboarding tooltip after a short delay
  useState(() => {
    if (!aiOnboardingSeen) {
      const timer = setTimeout(() => setShowAiTooltip(true), 2000);
      return () => clearTimeout(timer);
    }
  });
  
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

  // Mobile/Tablet Layout (< 1200px)
  if (isMobile) {
    return (
      <div className="min-h-screen w-full max-w-full overflow-x-hidden flex flex-col">
        <MobileHeader title={title} businessId={businessId} />
        <SubscriptionBanner />
        <main className="flex-1 flex flex-col min-h-0 max-w-full overflow-x-hidden pb-20">
          <div className="flex-1 max-w-full px-4">
            <PageFade key={String(title)}>
              {children}
            </PageFade>
          </div>
        </main>
        
        <MobileNavigation />

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
      </div>
    );
  }

  // Desktop Layout (≥ 1200px)
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full max-w-full overflow-x-hidden flex">
        <AppSidebar businessId={businessId} />
        <SidebarInset className="flex-1 flex flex-col min-h-0 max-w-full overflow-x-hidden">
          <SubscriptionBanner />
          <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0 max-w-full overflow-x-hidden">
          <header className="mb-4 md:mb-6 min-w-0">
              <div className="flex items-center justify-between gap-4 min-w-0">
                <h1 className="text-xl md:text-2xl font-bold truncate min-w-0">{title ?? 'Dashboard'}</h1>
                <div className="flex items-center gap-3">
                  <TooltipProvider>
                    <Tooltip open={showAiTooltip && !aiOnboardingSeen} onOpenChange={setShowAiTooltip}>
                      <TooltipTrigger asChild>
                        <div onClick={() => {
                          setShowAiTooltip(false);
                          setAiOnboardingSeen(true);
                        }}>
                          <AIStatusBadge />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs ai-fade-in">
                        <div className="space-y-2">
                          <p className="font-semibold flex items-center gap-2">
                            👋 New! AI Assistant
                          </p>
                          <p className="text-sm">
                            AI can auto-schedule jobs, optimize routes, and predict capacity issues. Click to see what it can do!
                          </p>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={() => {
                              setShowAiTooltip(false);
                              setAiOnboardingSeen(true);
                            }}
                          >
                            Got it!
                          </Button>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  <BusinessSwitcher businessId={businessId} />
                </div>
              </div>
          </header>
          <div className="flex-1 min-w-0">
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
      <AskAIButton />
    </SidebarProvider>
  );
}
