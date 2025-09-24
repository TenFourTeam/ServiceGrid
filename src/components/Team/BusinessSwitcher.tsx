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
import { useUserBusinesses } from "@/queries/useUserBusinesses";
import { useBusinessSwitcher } from "@/hooks/useBusinessSwitcher";
import { useBusinessContext } from "@/hooks/useBusinessContext";

export function BusinessSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const { data: businesses, isLoading } = useUserBusinesses();
  const { switchBusiness, isSwitching } = useBusinessSwitcher();
  const { businessName, businessId } = useBusinessContext();

  const handleSwitch = async (targetBusinessId: string) => {
    if (targetBusinessId === businessId) return;
    
    try {
      await switchBusiness.mutateAsync(targetBusinessId);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch business:', error);
    }
  };

  if (isLoading || !businesses || businesses.length <= 1) {
    return null; // Only show if user has multiple businesses
  }

  const currentBusiness = businesses.find(b => b.is_current);
  const otherBusinesses = businesses.filter(b => !b.is_current);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="w-full justify-between"
          disabled={isSwitching}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{businessName || 'Select Business'}</span>
            {currentBusiness && (
              <Badge 
                variant={currentBusiness.role === 'owner' ? 'default' : 'secondary'} 
                className="flex-shrink-0 flex items-center gap-1"
              >
                {currentBusiness.role === 'owner' ? (
                  <>
                    <Crown className="h-3 w-3" />
                    <span className="text-xs">Owner</span>
                  </>
                ) : (
                  <>
                    <Users className="h-3 w-3" />
                    <span className="text-xs">Worker</span>
                  </>
                )}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-80">
        <DropdownMenuLabel>Switch Business</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {currentBusiness && (
          <>
            <DropdownMenuItem className="flex items-center justify-between p-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="font-medium">{currentBusiness.name}</span>
                </div>
                <Badge 
                  variant={currentBusiness.role === 'owner' ? 'default' : 'secondary'}
                  className="flex items-center gap-1"
                >
                  {currentBusiness.role === 'owner' ? (
                    <Crown className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  {currentBusiness.role}
                </Badge>
              </div>
              <Check className="h-4 w-4 text-primary" />
            </DropdownMenuItem>
            
            {otherBusinesses.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        
        {otherBusinesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onClick={() => handleSwitch(business.id)}
            className="flex items-center justify-between p-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="font-medium">{business.name}</span>
              </div>
              <Badge 
                variant={business.role === 'owner' ? 'default' : 'secondary'}
                className="flex items-center gap-1"
              >
                {business.role === 'owner' ? (
                  <Crown className="h-3 w-3" />
                ) : (
                  <Users className="h-3 w-3" />
                )}
                {business.role}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              Joined {new Date(business.joined_at).toLocaleDateString()}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}