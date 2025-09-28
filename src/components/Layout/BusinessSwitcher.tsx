import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronDown, Building2, Crown, Users } from "lucide-react";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useUserBusinesses } from "@/hooks/useUserBusinesses";
import { useNavigate, useSearchParams } from "react-router-dom";

interface BusinessSwitcherProps {
  businessId?: string;
  className?: string;
}

export function BusinessSwitcher({ businessId, className = "" }: BusinessSwitcherProps) {
  const { business, role, businessName } = useBusinessContext(businessId);
  const { data: userBusinesses } = useUserBusinesses();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  
  const handleSwitchBusiness = (targetBusinessId: string, isCurrent: boolean) => {
    if (isCurrent) {
      navigate('/calendar');
    } else {
      navigate(`/calendar?businessId=${targetBusinessId}`);
    }
  };

  if (!userBusinesses || userBusinesses.length <= 1) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="text-sm text-muted-foreground">Viewing:</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={business?.logoUrl || undefined} alt={businessName} />
              <AvatarFallback className="text-xs">
                {businessName?.charAt(0).toUpperCase() || 'B'}
              </AvatarFallback>
            </Avatar>
            <span className="truncate max-w-32">{businessName}</span>
            <Badge variant={role === 'owner' ? 'default' : 'secondary'} className="text-xs">
              {role === 'owner' ? (
                <Crown className="h-3 w-3 mr-1" />
              ) : (
                <Users className="h-3 w-3 mr-1" />
              )}
              {role}
            </Badge>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {userBusinesses.map((userBusiness) => (
            <DropdownMenuItem
              key={userBusiness.id}
              onClick={() => handleSwitchBusiness(userBusiness.id, userBusiness.is_current)}
              className="flex items-center gap-3 p-3"
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={userBusiness.logo_url || undefined} alt={userBusiness.name} />
                <AvatarFallback className="text-xs">
                  {userBusiness.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{userBusiness.name}</span>
                  {userBusiness.is_current && (
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  )}
                  {businessId === userBusiness.id && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  {userBusiness.role === 'owner' ? (
                    <Crown className="h-3 w-3" />
                  ) : (
                    <Users className="h-3 w-3" />
                  )}
                  {userBusiness.role}
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}