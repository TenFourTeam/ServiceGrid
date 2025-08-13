import { Link } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';

import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';

import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useStore } from '@/store/useAppStore';
import { PageFade } from '@/components/Motion/PageFade';
import { TrialBanner } from '@/components/Onboarding/TrialBanner';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const onboarding = useOnboarding();

  useEffect(() => {
    document.title = title ? `${title} • ServiceGrid` : 'ServiceGrid';
  }, [title]);

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
