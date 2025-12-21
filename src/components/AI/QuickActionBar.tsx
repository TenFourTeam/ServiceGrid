import { getQuickActionsForPage, QuickAction } from '@/lib/quick-actions';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface QuickActionBarProps {
  currentPage: string;
  onActionClick: (action: QuickAction) => void;
  isStreaming?: boolean;
  activeActionId?: string;
}

export function QuickActionBar({ 
  currentPage, 
  onActionClick, 
  isStreaming,
  activeActionId 
}: QuickActionBarProps) {
  const actions = getQuickActionsForPage(currentPage);
  const isMobile = useIsMobile();

  if (actions.length === 0) return null;

  return (
    <div 
      className={cn(
        "flex-shrink-0 border-b border-border bg-muted/30 transition-opacity duration-200",
        isStreaming && "opacity-50 pointer-events-none"
      )}
    >
      <div 
        className={cn(
          "flex gap-2 p-3",
          isMobile ? "overflow-x-auto scrollbar-hide" : "flex-wrap justify-center"
        )}
      >
        {actions.map((action) => {
          const Icon = action.icon;
          const isActive = activeActionId === action.id;
          const label = isMobile ? (action.shortLabel || action.label) : action.label;
          
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => onActionClick(action)}
              disabled={isStreaming}
              className={cn(
                "gap-1.5 whitespace-nowrap flex-shrink-0 h-8 px-3 text-xs font-medium",
                "border-border/50 bg-background hover:bg-primary/5 hover:border-primary/30 hover:text-primary",
                "transition-all duration-150",
                isActive && "bg-primary/10 border-primary/50 text-primary"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
