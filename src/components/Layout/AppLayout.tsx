import { Link } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';
import { RequireRole } from '@/components/Auth/RequireRole';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';
import { EnhancedInviteModal } from '@/components/Team/EnhancedInviteModal';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { PageFade } from '@/components/Motion/PageFade';
import { TrialSystem } from '@/components/Onboarding/TrialSystem';
import { HelpWidget } from '@/components/Onboarding/HelpWidget';
import { IntentPickerModal } from '@/components/Onboarding/IntentPickerModal';
import { useOnboardingState } from '@/onboarding/streamlined';
import { useOnboardingActions } from '@/onboarding/hooks';
import { UserPlus } from 'lucide-react';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showIntentPicker, setShowIntentPicker] = useState(false);
  const { businessId, role } = useBusinessContext();
  
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
          <TrialSystem />
          <div className="p-4 md:p-6 flex flex-col flex-1 min-h-0">
          <header className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">{title ?? 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary"><Link to="/quotes?new=1">New Quote</Link></Button>
              {/* New Job Sheet trigger */}
              <NewJobSheet />
              {/* Global Invite Worker action (owner only) */}
              <RequireRole role="owner" fallback={null}>
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Worker
                </Button>
              </RequireRole>
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

      {/* Global Invite Modal */}
      <RequireRole role="owner" fallback={null}>
        <EnhancedInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          businessId={businessId || ''}
        />
      </RequireRole>
    </SidebarProvider>
  );
}
