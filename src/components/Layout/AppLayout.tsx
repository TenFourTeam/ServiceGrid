import { Link } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';

import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';

import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useStore } from '@/store/useAppStore';
import { useDashboardData } from '@/hooks/useDashboardData';
import { PageFade } from '@/components/Motion/PageFade';
import { TrialBanner } from '@/components/Onboarding/TrialBanner';
import { AppLayoutSkeleton } from '@/components/ui/skeleton-layout';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const store = useStore();
  const onboarding = useOnboarding();
  const { data: dashboardData, isLoading, error } = useDashboardData();

  useEffect(() => {
    document.title = title ? `${title} • ServiceGrid` : 'ServiceGrid';
  }, [title]);

  // Update store with business data when available
  useEffect(() => {
    if (dashboardData?.business) {
      const b = dashboardData.business;
      store.setBusiness({
        id: b.id,
        name: b.name ?? store.business.name,
        phone: b.phone || store.business.phone || '',
        replyToEmail: b.reply_to_email || store.business.replyToEmail || '',
        logoUrl: b.logo_url || store.business.logoUrl,
        lightLogoUrl: b.light_logo_url || store.business.lightLogoUrl,
        taxRateDefault: Number(b.tax_rate_default ?? store.business.taxRateDefault) || 0,
        numbering: {
          estPrefix: b.est_prefix ?? store.business.numbering.estPrefix,
          estSeq: Number(b.est_seq ?? store.business.numbering.estSeq) || store.business.numbering.estSeq,
          invPrefix: b.inv_prefix ?? store.business.numbering.invPrefix,
          invSeq: Number(b.inv_seq ?? store.business.numbering.invSeq) || store.business.numbering.invSeq,
        },
      });
    }
  }, [dashboardData?.business, store]);

  // Show skeleton while loading critical data
  if (isLoading) {
    return <AppLayoutSkeleton />;
  }

  // Show error state if data loading failed
  if (error) {
    return (
      <AppLayoutSkeleton>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Failed to load application data</p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        </div>
      </AppLayoutSkeleton>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex flex-col">
        <TrialBanner />
        <div className="flex flex-1">
          <AppSidebar />
          <SidebarInset className="flex-1 p-4 md:p-6 flex flex-col min-h-0">
          <header className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <h1 className="text-xl md:text-2xl font-bold">{title ?? 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary"><Link to="/quotes?new=1">New Quote</Link></Button>
              {/* New Job Sheet trigger */}
              <NewJobSheet />
              
            </div>
          </header>
          <div className="flex-1">
            <PageFade key={String(title)}>
              {children}
            </PageFade>
          </div>
        </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
