import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export interface EntityOption {
  id: string;
  label: string;
  value: string;
  metadata?: {
    status?: string;
    customer?: string;
    total?: number;
    createdAt?: string;
    number?: string;
    [key: string]: any;
  };
}

export interface EntitySelectionData {
  planId: string;
  question: string;
  resolvesEntity: string;
  options: EntityOption[];
}

interface EntitySelectionMessageProps {
  selection: EntitySelectionData;
  onSelect: (planId: string, entityType: string, entityValue: string) => void;
}

function getStatusBadgeVariant(status?: string): 'default' | 'secondary' | 'outline' | 'destructive' {
  if (!status) return 'outline';
  const lower = status.toLowerCase();
  if (['approved', 'paid', 'completed', 'accepted'].includes(lower)) return 'default';
  if (['pending', 'draft', 'sent'].includes(lower)) return 'secondary';
  if (['rejected', 'cancelled', 'overdue'].includes(lower)) return 'destructive';
  return 'outline';
}

function formatCurrency(amount?: number): string {
  if (amount === undefined) return '';
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch {
    return '';
  }
}

export function EntitySelectionMessage({ selection, onSelect }: EntitySelectionMessageProps) {
  const hasRichMetadata = selection.options.some(
    opt => opt.metadata?.status || opt.metadata?.customer || opt.metadata?.total || opt.metadata?.number
  );

  return (
    <div className="space-y-3 animate-fade-in">
      {/* Options - Rich cards for quotes/invoices, simple buttons for others */}
      {hasRichMetadata ? (
        <div className="grid gap-2">
          {selection.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => onSelect(selection.planId, selection.resolvesEntity, option.value)}
              className={cn(
                "w-full text-left p-3 rounded-xl border border-border/50",
                "bg-gradient-to-br from-card to-muted/30",
                "hover:border-primary/40 hover:bg-muted/50",
                "transition-all duration-200 hover:scale-[1.01]",
                "focus:outline-none focus:ring-2 focus:ring-primary/20"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Header: Number/Label + Status */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-foreground">
                      {option.metadata?.number || option.label}
                    </span>
                    {option.metadata?.status && (
                      <Badge 
                        variant={getStatusBadgeVariant(option.metadata.status)}
                        className="text-[10px] py-0 px-1.5 font-medium"
                      >
                        {option.metadata.status}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Customer */}
                  {option.metadata?.customer && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <User className="w-3 h-3" />
                      <span className="truncate">{option.metadata.customer}</span>
                    </div>
                  )}
                  
                  {/* Footer: Amount + Date */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {option.metadata?.total !== undefined && (
                      <div className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <DollarSign className="w-3 h-3 text-muted-foreground" />
                        {formatCurrency(option.metadata.total)}
                      </div>
                    )}
                    {option.metadata?.createdAt && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(option.metadata.createdAt)}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Selection indicator */}
                <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center group-hover:border-primary/50 transition-colors">
                  <span className="text-xs text-muted-foreground font-medium">{index + 1}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        /* Simple button layout for non-rich options */
        <div className="flex flex-wrap gap-2">
          {selection.options.map((option) => (
            <Button
              key={option.id}
              variant="outline"
              size="sm"
              onClick={() => onSelect(selection.planId, selection.resolvesEntity, option.value)}
              className="gap-2"
            >
              <FileText className="w-3.5 h-3.5" />
              {option.label}
            </Button>
          ))}
        </div>
      )}
      
      {/* Hint text */}
      <p className="text-xs text-muted-foreground">
        Click to select, or type your choice (e.g., "the first one" or the quote number)
      </p>
    </div>
  );
}
