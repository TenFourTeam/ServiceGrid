import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, LogOut, Shield, FileText, Calendar as CalendarIcon, Receipt, Users, Wrench, Clock } from "lucide-react";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import { useUser } from "@clerk/clerk-react";
import { useProfile } from "@/queries/useProfile";
import BusinessLogo from "@/components/BusinessLogo";
import { SignOutButton } from "@/components/Auth/SignOutButton";
import { Separator } from "@/components/ui/separator";

interface MobileHeaderProps {
  title?: string;
}

const allNavItems = [
  { title: "Calendar", url: "/calendar", icon: CalendarIcon, workerAccess: true },
  { title: "Timesheet", url: "/timesheet", icon: Clock, workerAccess: true },
  { title: "Work Orders", url: "/work-orders", icon: Wrench, workerAccess: false },
  { title: "Quotes", url: "/quotes", icon: FileText, workerAccess: false },
  { title: "Invoices", url: "/invoices", icon: Receipt, workerAccess: false },
  { title: "Customers", url: "/customers", icon: Users, workerAccess: false },
  { title: "Team", url: "/team", icon: Shield, workerAccess: false },
];

export default function MobileHeader({ title }: MobileHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { businessName, businessLogoUrl, businessLightLogoUrl, businessId, role } = useBusinessContext();
  const { data: userBusinesses } = useUserBusinesses();
  const { switchBusiness, isSwitching } = useBusinessSwitcher();
  const { user } = useUser();
  const { data: profile } = useProfile();

  // Find the business where the user is an owner
  const ownedBusiness = userBusinesses?.find(b => b.role === 'owner');
  const isInOwnBusiness = businessId === ownedBusiness?.id;

  // Filter items based on user role
  const visibleNavItems = allNavItems.filter(item => role === 'owner' || item.workerAccess);

  const isActivePath = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="flex items-center justify-between p-4 border-b border-border bg-background">
      <div className="flex items-center gap-3">
        <BusinessLogo 
          size={32} 
          src={businessLightLogoUrl || businessLogoUrl} 
          alt={`${businessName || "Business"} logo`} 
        />
        <div>
          <h1 className="font-semibold text-lg">{title || businessName}</h1>
          <p className="text-xs text-muted-foreground">Contractor Console</p>
        </div>
      </div>

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

              {!isInOwnBusiness && ownedBusiness && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => switchBusiness.mutate(ownedBusiness.id)}
                    disabled={isSwitching}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    My Business ({ownedBusiness.name})
                  </Button>
                  <Separator />
                </>
              )}

              <div className="space-y-2">
                {visibleNavItems.map((item) => (
                  <Button
                    key={item.url}
                    variant="ghost"
                    className={`w-full justify-start ${
                      isActivePath(item.url)
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => navigate(item.url)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Button>
                ))}
              </div>

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
    </header>
  );
}