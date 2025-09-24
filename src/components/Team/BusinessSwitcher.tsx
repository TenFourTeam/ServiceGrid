import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Building2, Crown, Users, Check } from "lucide-react";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useOrganizationList } from "@clerk/clerk-react";

export function BusinessSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { userMemberships, isLoaded } = useOrganizationList();
  const { switchBusiness, isSwitching } = useBusinessSwitcher();
  const { businessName, businessId } = useBusinessContext();

  // Only show switcher if user has multiple organizations
  if (!isLoaded || !userMemberships?.data || userMemberships.data.length <= 1) {
    return null;
  }

  const currentOrg = userMemberships.data.find(org => org.organization.id === businessId);
  const otherOrgs = userMemberships.data.filter(org => org.organization.id !== businessId);

  const handleSwitch = async (targetOrgId: string) => {
    try {
      await switchBusiness.mutateAsync(targetOrgId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch organization:', error);
    }
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={isSwitching}
        >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="font-medium">{businessName || currentOrg?.organization.name}</span>
              <Badge variant="secondary" className="text-xs">
                {currentOrg?.role === 'org:admin' ? (
                  <>
                    <Crown className="h-3 w-3 mr-1" />
                    Owner
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3 mr-1" />
                    Member
                  </>
                )}
              </Badge>
            </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Current Organization</DropdownMenuLabel>
        <DropdownMenuItem className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <div>
              <div className="font-medium">{businessName || currentOrg?.organization.name}</div>
              <div className="text-sm text-muted-foreground">
                {currentOrg?.role === 'org:admin' ? 'Owner' : 'Member'}
              </div>
            </div>
          </div>
          <Check className="h-4 w-4" />
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Switch Organization</DropdownMenuLabel>
        {otherOrgs.map((org) => (
          <DropdownMenuItem
            key={org.organization.id}
            onClick={() => handleSwitch(org.organization.id)}
            disabled={isSwitching}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <div>
                <div className="font-medium">{org.organization.name}</div>
                <div className="text-sm text-muted-foreground">
                  {org.role === 'org:admin' ? 'Owner' : 'Member'} • Joined {new Date(org.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}