import { Building2, MessageCircle, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CustomerBusiness } from '@/types/customerAuth';

interface CustomerMessagingHeaderProps {
  businessName?: string;
  businessLogoUrl?: string | null;
  isMultiBusiness?: boolean;
  businesses?: CustomerBusiness[];
  activeBusinessId?: string | null;
  onSwitchBusiness?: (businessId: string) => void;
  isSwitching?: boolean;
}

export function CustomerMessagingHeader({
  businessName = 'Your Contractor',
  businessLogoUrl,
  isMultiBusiness = false,
  businesses = [],
  activeBusinessId,
  onSwitchBusiness,
  isSwitching = false,
}: CustomerMessagingHeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col border rounded-lg bg-gradient-to-r from-primary/5 to-transparent overflow-hidden">
      {/* Main header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-12 w-12 ring-2 ring-primary/20">
          {businessLogoUrl ? (
            <AvatarImage src={businessLogoUrl} alt={businessName} />
          ) : null}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {businessLogoUrl ? null : <Building2 className="h-6 w-6" />}
            {!businessLogoUrl && getInitials(businessName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MessageCircle className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-foreground">
              Messaging
            </h3>
            <Badge variant="secondary" className="font-semibold">
              {businessName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Your messages go directly to this contractor
          </p>
        </div>
        
        {/* Inline business switcher for multi-business */}
        {isMultiBusiness && businesses.length > 1 && onSwitchBusiness && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isSwitching}>
                Switch
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {businesses.map((business) => (
                <DropdownMenuItem
                  key={business.id}
                  onClick={() => onSwitchBusiness(business.id)}
                  disabled={business.id === activeBusinessId}
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-6 w-6">
                    {business.logo_url ? (
                      <AvatarImage src={business.logo_url} alt={business.name} />
                    ) : null}
                    <AvatarFallback className="text-xs">
                      {getInitials(business.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{business.name}</span>
                  {business.id === activeBusinessId && (
                    <Badge variant="outline" className="ml-auto text-xs">Active</Badge>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      {/* Context warning for multi-business */}
      {isMultiBusiness && businesses.length > 1 && (
        <div className="px-4 pb-3">
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 rounded-md">
            <span className="font-medium">📍 You're messaging {businessName}</span>
            <span className="text-muted-foreground">• Switch above to contact a different contractor</span>
          </div>
        </div>
      )}
    </div>
  );
}