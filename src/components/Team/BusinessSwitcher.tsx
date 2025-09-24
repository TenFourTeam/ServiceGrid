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
import { useOrganization, useOrganizationList } from '@clerk/clerk-react';
import { useCurrentBusiness } from "@/contexts/CurrentBusinessContext";
import { toast } from "sonner";

export function BusinessSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { organization } = useOrganization();
  const { userMemberships, setActive, isLoaded } = useOrganizationList();
  const { setCurrentBusinessId } = useCurrentBusiness();

  const handleSwitch = async (targetOrganizationId: string) => {
    if (targetOrganizationId === organization?.id) return;
    
    try {
      await setCurrentBusinessId(targetOrganizationId);
      setIsOpen(false);
      toast.success('Business switched successfully');
    } catch (error) {
      console.error('Failed to switch business:', error);
      toast.error('Failed to switch business');
    }
  };

  if (!isLoaded || !userMemberships?.data || userMemberships.data.length <= 1) {
    return null; // Only show if user has multiple organizations
  }

  const currentOrgId = organization?.id;
  const otherOrganizations = userMemberships.data.filter(
    membership => membership.organization.id !== currentOrgId
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{organization?.name || 'Select Business'}</span>
            {organization && (
              <Badge 
                variant="default"
                className="flex-shrink-0 flex items-center gap-1"
              >
                <Crown className="h-3 w-3" />
                <span className="text-xs">Active</span>
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {organization && (
          <>
            <DropdownMenuItem className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{organization.name}</span>
                </div>
                <Badge 
                  variant="default"
                  className="flex items-center gap-1"
                >
                  <Crown className="h-3 w-3" />
                  Active
                </Badge>
              </div>
              <Check className="h-4 w-4 text-primary" />
            </DropdownMenuItem>
            
            {otherOrganizations.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        
        {otherOrganizations.map((membership) => (
          <DropdownMenuItem
            key={membership.organization.id}
            onClick={() => handleSwitch(membership.organization.id)}
            className="flex items-center justify-between p-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{membership.organization.name}</span>
              </div>
              <Badge 
                variant="secondary"
                className="flex items-center gap-1"
              >
                <Users className="h-3 w-3" />
                {membership.role}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Member since {new Date(membership.createdAt).toLocaleDateString()}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}