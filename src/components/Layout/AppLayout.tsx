import { Link } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useClerk } from '@clerk/clerk-react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/Layout/AppSidebar';

export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const { signOut } = useAuth();
  const { signOut: clerkSignOut } = useClerk();

  useEffect(() => {
    document.title = title ? `${title} • TenFour Lawn` : 'TenFour Lawn';
  }, [title]);

  return (
    <SidebarProvider>
      <div className="min-h-screen w-full flex">
        <AppSidebar />
        <SidebarInset className="flex-1 p-4 md:p-6">
          <header className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger aria-label="Toggle navigation" />
              <h1 className="text-xl md:text-2xl font-bold">{title ?? 'Dashboard'}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="secondary"><Link to="/quotes?new=1">New Quote</Link></Button>
              {/* New Job Sheet trigger */}
              <NewJobSheet />
              <Button variant="outline" onClick={async () => { try { await clerkSignOut?.(); } catch {} finally { await signOut(); } }}>Sign out</Button>
            </div>
          </header>
          {children}
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
