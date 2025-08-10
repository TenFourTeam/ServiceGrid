import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useEffect } from 'react';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { NewJobSheet } from '@/components/Job/NewJobSheet';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useClerk } from '@clerk/clerk-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
export default function AppLayout({ children, title }: { children: ReactNode; title?: string }) {
  const location = useLocation();
  const { business } = useStore();
  const { signOut } = useAuth();
  const { signOut: clerkSignOut } = useClerk();

  useEffect(() => { document.title = title ? `${title} • TenFour Lawn` : 'TenFour Lawn'; }, [title]);

  const NavLink = ({ to, label }: { to: string; label: string }) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link to={to} className={`px-3 py-2 rounded-md text-sm font-medium ${active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'}`}>
        {label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[260px_1fr]">
      <aside className="hidden md:flex border-r bg-card p-4 flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-full bg-primary" aria-hidden />
          <div>
            <div className="font-semibold">{business.name || 'Business'}</div>
            <div className="text-xs text-muted-foreground">Contractor Console</div>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/calendar" label="Calendar" />
          <NavLink to="/work-orders" label="Work Orders" />
          <NavLink to="/quotes" label="Quotes" />
          <NavLink to="/invoices" label="Invoices" />
          <NavLink to="/customers" label="Customers" />
          <NavLink to="/settings" label="Settings" />
        </nav>
        <div className="mt-auto text-xs text-muted-foreground">v0 Prototype</div>
      </aside>
      <main className="p-4 md:p-6">
        <header className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2">
            {/* Mobile nav trigger */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open navigation">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64">
                <SheetHeader>
                  <SheetTitle>Navigation</SheetTitle>
                </SheetHeader>
                <nav className="mt-4 flex flex-col gap-1">
                  <NavLink to="/calendar" label="Calendar" />
                  <NavLink to="/work-orders" label="Work Orders" />
                  <NavLink to="/quotes" label="Quotes" />
                  <NavLink to="/invoices" label="Invoices" />
                  <NavLink to="/customers" label="Customers" />
                  <NavLink to="/settings" label="Settings" />
                </nav>
              </SheetContent>
            </Sheet>
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
      </main>
    </div>
  );
}
