import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Settings, LogOut, Shield, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

export default function MobileHeader({ title }: MobileHeaderProps) {
  const navigate = useNavigate();
  const { businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { data: userBusinesses } = useUserBusinesses();
  const { switchBusiness, isSwitching } = useBusinessSwitcher();
  const { user } = useUser();
  const { data: profile } = useProfile();

  // Find the business where the user is an owner
  const ownedBusiness = userBusinesses?.find(b => b.role === 'owner');
  const isInOwnBusiness = businessId === ownedBusiness?.id;

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
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/settings')}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Button>

                <Button
                  variant="ghost"
                  className="w-full justify-start"
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