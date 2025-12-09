import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  LayoutDashboard, 
  FileText, 
  Calendar, 
  MessageSquare, 
  LogOut,
  Building2,
  User,
  Menu,
  X
} from 'lucide-react';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
  { to: '/portal', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/portal/documents', icon: FileText, label: 'Documents' },
  { to: '/portal/schedule', icon: Calendar, label: 'Schedule' },
  { to: '/portal/messages', icon: MessageSquare, label: 'Messages' },
];

export function CustomerPortalLayout() {
  const navigate = useNavigate();
  const { customerDetails, logout } = useCustomerAuth();
  const { data: jobData } = useCustomerJobData();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/customer-login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const business = jobData?.business || customerDetails?.business;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo & Business Name */}
            <div className="flex items-center gap-3">
              {business?.logo_url ? (
                <img 
                  src={business.logo_url} 
                  alt={business.name}
                  className="h-8 w-8 rounded-md object-contain"
                />
              ) : (
                <Building2 className="h-8 w-8 text-primary" />
              )}
              <div className="hidden sm:block">
                <h1 className="font-semibold text-sm">
                  {business?.name || 'Customer Portal'}
                </h1>
                <p className="text-xs text-muted-foreground">Customer Portal</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {customerDetails?.name ? getInitials(customerDetails.name) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right max-w-[120px]">
                  <p className="text-sm font-medium truncate">{customerDetails?.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>

              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <nav className="md:hidden flex flex-col gap-1 pt-3 pb-2 border-t mt-3">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
