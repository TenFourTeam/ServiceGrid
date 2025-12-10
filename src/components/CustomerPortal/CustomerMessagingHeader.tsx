import { Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CustomerMessagingHeaderProps {
  businessName?: string;
  businessLogoUrl?: string | null;
  customerName?: string;
  showBadge?: boolean;
}

export function CustomerMessagingHeader({ 
  businessName, 
  businessLogoUrl, 
  customerName,
  showBadge = false 
}: CustomerMessagingHeaderProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg border border-primary/20">
      <div className="flex-shrink-0">
        {businessLogoUrl ? (
          <img 
            src={businessLogoUrl} 
            alt={businessName || 'Business'} 
            className="h-12 w-12 rounded-lg object-contain bg-background p-1 border"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-semibold text-base truncate">
            Messaging {businessName || 'Your Contractor'}
          </h3>
          {showBadge && (
            <Badge variant="secondary" className="text-xs bg-primary/10 text-primary shrink-0">
              Active
            </Badge>
          )}
        </div>
        {customerName && (
          <p className="text-sm text-muted-foreground truncate">
            Signed in as {customerName}
          </p>
        )}
      </div>
    </div>
  );
}
