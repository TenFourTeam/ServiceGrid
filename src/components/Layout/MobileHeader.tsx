import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, LogOut, Shield, FileText, Calendar as CalendarIcon, Receipt, Users, Wrench, Clock, ClipboardList, UserPlus, BarChart3 } from "lucide-react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUser } from "@clerk/clerk-react";
import { useProfile } from "@/queries/useProfile";
import BusinessLogo from "@/components/BusinessLogo";
import { SignOutButton } from "@/components/Auth/SignOutButton";
import { Separator } from "@/components/ui/separator";
import { BusinessSwitcher } from "@/components/Layout/BusinessSwitcher";
import { useIsPhone } from "@/hooks/use-phone";

interface MobileHeaderProps {
  title?: string;
  businessId?: string;
}

// Core navigation items (Group 1)
const coreNavItems = [
  { title: "Calendar", url: "/calendar", icon: CalendarIcon, workerAccess: true },
  { title: "Timesheet", url: "/timesheet", icon: Clock, workerAccess: true },
  { title: "Team", url: "/team", icon: Shield, workerAccess: false },
  { title: "Analytics", url: "/analytics", icon: BarChart3, workerAccess: false },
];

// Business navigation items (Group 2)
const businessNavItems = [
  { title: "Requests", url: "/requests", icon: ClipboardList, workerAccess: false },
  { title: "Customers", url: "/customers", icon: Users, workerAccess: false },
  { title: "Quotes", url: "/quotes", icon: FileText, workerAccess: false },
  { title: "Work Orders", url: "/work-orders", icon: Wrench, workerAccess: false },
  { title: "Invoices", url: "/invoices", icon: Receipt, workerAccess: false },
];

export default function MobileHeader({ title, businessId }: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessName, businessLogoUrl, businessLightLogoUrl, role, business } = useBusinessContext(businessId);
  const { user } = useUser();
  const { data: profile } = useProfile();
  const isPhone = useIsPhone();

  // Filter items based on user role
  const visibleCoreItems = coreNavItems.filter(item => role === 'owner' || item.workerAccess);
  const visibleBusinessItems = businessNavItems.filter(item => role === 'owner' || item.workerAccess);

  const buildUrl = (path: string) => {
    return businessId && !business?.is_current 
      ? `${path}?businessId=${businessId}`
      : path;
  };

  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="flex flex-col gap-2 p-4 border-b border-border bg-background">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BusinessLogo 
            size={32} 
            src={(businessLightLogoUrl || businessLogoUrl) as string} 
            alt={`${businessName || "Business"} logo`} 
          />
          <div>
            <h1 className="font-semibold text-lg">{title || businessName}</h1>
            <p className="text-xs text-muted-foreground">Contractor Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isPhone && <BusinessSwitcher businessId={businessId} />}
          
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
          <SheetContent side="right">
            <div className="flex flex-col h-full">
              <div className="space-y-4">
                <div className="text-center">
                  <p className="font-medium">{profile?.profile?.fullName || user?.fullName || "Account"}</p>
                  <p className="text-sm text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress}
                  </p>
                </div>

                <Separator />

                {/* Core Navigation - Group 1 */}
                <div className="space-y-2">
                  {visibleCoreItems.map((item) => (
                    <Button
                      key={item.url}
                      variant="ghost"
                      className={`w-full justify-start ${
                        isActivePath(item.url)
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => navigate(buildUrl(item.url))}
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </Button>
                  ))}
                </div>

                {visibleBusinessItems.length > 0 && (
                  <>
                    <Separator />
                    
                    {/* Business Navigation - Group 2 */}
                    <div className="space-y-2">
                      {visibleBusinessItems.map((item) => (
                        <Button
                          key={item.url}
                          variant="ghost"
                          className={`w-full justify-start ${
                            isActivePath(item.url)
                              ? "bg-accent text-accent-foreground"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => navigate(buildUrl(item.url))}
                        >
                          <item.icon className="mr-2 h-4 w-4" />
                          {item.title}
                        </Button>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      location.pathname === '/settings'
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => navigate('/settings')}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Button>

                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      location.pathname === '/legal'
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => navigate('/legal')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Terms & Services
                  </Button>

                  <Button
                    variant="ghost"
                    className={`w-full justify-start ${
                      location.pathname === '/referral'
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => navigate('/referral')}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Refer A Friend
                  </Button>
                </div>
              </div>

              <div className="mt-auto pt-4">
                <Separator className="mb-4" />
                <SignOutButton 
                  variant="ghost" 
                  size="sm" 
                  showConfirmation={false} 
                  onSignOut={() => {
                    sessionStorage.setItem('just-logged-out', 'true');
                  }} 
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
        </div>
      </div>
      
      {isPhone && <BusinessSwitcher businessId={businessId} className="w-full" />}
    </header>
  );
}