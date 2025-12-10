import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CustomerBusiness } from '@/types/customerAuth';

interface CustomerBusinessSwitcherProps {
  businesses: CustomerBusiness[];
  activeBusinessId: string | null;
  onSwitch: (businessId: string) => Promise<void>;
  isLoading?: boolean;
}

export function CustomerBusinessSwitcher({
  businesses,
  activeBusinessId,
  onSwitch,
  isLoading,
}: CustomerBusinessSwitcherProps) {
  const activeBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];
  const [switching, setSwitching] = React.useState(false);

  if (businesses.length <= 1) {
    return null;
  }

  const handleSwitch = async (businessId: string) => {
    if (businessId === activeBusinessId || switching) return;
    
    setSwitching(true);
    try {
      await onSwitch(businessId);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 h-auto py-1.5 px-2"
          disabled={switching || isLoading}
        >
          {activeBusiness?.logo_url ? (
            <Avatar className="h-6 w-6">
              <AvatarImage src={activeBusiness.logo_url} alt={activeBusiness.name} />
              <AvatarFallback>
                <Building2 className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : (
            <Building2 className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm font-medium max-w-[120px] truncate">
            {activeBusiness?.name || 'Select Business'}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Switch contractor
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {businesses.map((business) => (
          <DropdownMenuItem
            key={business.id}
            onClick={() => handleSwitch(business.id)}
            className={cn(
              "flex items-center gap-3 py-2 cursor-pointer",
              business.id === activeBusinessId && "bg-primary/5"
            )}
          >
            {business.logo_url ? (
              <Avatar className="h-8 w-8">
                <AvatarImage src={business.logo_url} alt={business.name} />
                <AvatarFallback>
                  <Building2 className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{business.name}</p>
              {business.customer_name && (
                <p className="text-xs text-muted-foreground truncate">
                  as {business.customer_name}
                </p>
              )}
            </div>
            {business.id === activeBusinessId && (
              <Check className="h-4 w-4 text-primary shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
