import { Link } from 'react-router-dom';
import { ReactNode, useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';
import { EnhancedInviteModal } from '@/components/Team/EnhancedInviteModal';

import { useBusinessRole } from '@/hooks/useBusinessRole';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useAuthSnapshot } from '@/auth';
import { PageFade } from '@/components/Motion/PageFade';
import { TrialBanner } from '@/components/Onboarding/TrialBanner';
import { FloatingSetupWidget } from '@/components/Onboarding/FloatingSetupWidget';
import { IntentPickerModal } from '@/components/Onboarding/IntentPickerModal';
import { useOnboardingState } from '@/onboarding/streamlined';
import { useOnboardingActions } from '@/onboarding/hooks';
import { useUI } from '@/store/ui';
import { UserPlus } from 'lucide-react';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const { snapshot } = useAuthSnapshot();
  const businessId = snapshot.businessId;
  const { data: businessRole } = useBusinessRole(businessId);
  
  // Onboarding system
  const onboardingState = useOnboardingState();
  const onboardingActions = useOnboardingActions();
  const { modals, setModal } = useUI();
  
  // Show intent picker modal for new users
  const showIntentPicker = onboardingState.showIntentPicker && !modals.intentPicker;

  useEffect(() => {
    document.title = title ? `${title} • ServiceGrid` : 'ServiceGrid';
  }, [title]);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-0">
          <TrialBanner />
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
              {businessRole?.role === 'owner' && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Worker
                </Button>
              )}
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
        onOpenChange={(open) => setModal('intentPicker', open)}
        onScheduleJob={onboardingActions.openNewJobSheet}
        onCreateQuote={onboardingActions.openCreateQuote}
        onAddCustomer={onboardingActions.openAddCustomer}
        onImportCustomers={onboardingActions.openImportCustomers}
      />
      
      <FloatingSetupWidget
        onSetupProfile={onboardingActions.openSetupProfile}
        onAddCustomer={onboardingActions.openAddCustomer}
        onCreateJob={onboardingActions.openNewJobSheet}
        onCreateQuote={onboardingActions.openCreateQuote}
        onLinkBank={onboardingActions.openBankLink}
        onStartSubscription={onboardingActions.openSubscription}
      />

      {/* Global Invite Modal */}
      {businessRole?.role === 'owner' && (
        <EnhancedInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          businessId={businessId || ''}
        />
      )}
    </SidebarProvider>
  );
}
