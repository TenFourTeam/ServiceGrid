import { Link } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';

import { useClerk, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';
import { useStore } from '@/store/useAppStore';
import { edgeFetchJson } from '@/utils/edgeApi';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const store = useStore();
  
  const { signOut: clerkSignOut } = useClerk();
  const { getToken, isSignedIn } = useClerkAuth();

  useEffect(() => {
    document.title = title ? `${title} • TenFour Lawn` : 'TenFour Lawn';
  }, [title]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const data = await edgeFetchJson("get-business", getToken);
        const b = data?.business;
        if (b?.id) {
          store.setBusiness({
            id: b.id,
            name: b.name ?? store.business.name,
            phone: b.phone ?? '',
            replyToEmail: b.reply_to_email ?? '',
            logoUrl: b.logo_url ?? '',
            taxRateDefault: Number(b.tax_rate_default ?? store.business.taxRateDefault) || 0,
            numbering: {
              estPrefix: b.est_prefix ?? store.business.numbering.estPrefix,
              estSeq: Number(b.est_seq ?? store.business.numbering.estSeq) || store.business.numbering.estSeq,
              invPrefix: b.inv_prefix ?? store.business.numbering.invPrefix,
              invSeq: Number(b.inv_seq ?? store.business.numbering.invSeq) || store.business.numbering.invSeq,
            },
          });
        }
      } catch (e) {
        console.error('[AppLayout] hydrate business failed', e);
      }
    })();
  }, [isSignedIn]);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
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
              <Button variant="outline" onClick={async () => { try { await clerkSignOut?.(); } catch {} }}>Sign out</Button>
            </div>
          </header>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
