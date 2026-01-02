import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { ChevronDown, Code2, Settings2, CheckSquare, Play } from 'lucide-react';
import { useState } from 'react';
import type { DimensionScore, VerificationDimension } from '@/lib/verification/types';

interface DimensionBreakdownProps {
  dimensions: DimensionScore[];
}

const dimensionConfig: Record<VerificationDimension, { icon: React.ElementType; label: string; description: string }> = {
  implementation: { 
    icon: Code2, 
    label: 'Implementation', 
    description: 'Code exists and follows patterns' 
  },
  configuration: { 
    icon: Settings2, 
    label: 'Configuration', 
    description: 'Settings and environment variables' 
  },
  verification: { 
    icon: CheckSquare, 
    label: 'Verification', 
    description: 'Tests pass and contracts valid' 
  },
  validation: { 
    icon: Play, 
    label: 'Validation', 
    description: 'E2E and runtime health' 
  },
};

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 70) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
}

export function DimensionBreakdown({ dimensions }: DimensionBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-sm font-medium hover:text-primary transition-colors">
        <span>Dimension Breakdown</span>
        <ChevronDown className={cn(
          'h-4 w-4 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </CollapsibleTrigger>
      
      <CollapsibleContent className="space-y-3 pt-2">
        {dimensions.map((dim) => {
          const config = dimensionConfig[dim.dimension];
          const DimIcon = config.icon;
          
          return (
            <div 
              key={dim.dimension}
              className="rounded-md border border-border/50 p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DimIcon className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">{config.label}</span>
                    <p className="text-xs text-muted-foreground">
                      {config.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn('text-lg font-bold', getScoreColor(dim.score))}>
                    {dim.score}%
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {dim.passed}/{dim.total}
                  </p>
                </div>
              </div>
              <Progress value={dim.score} className="h-1.5" />
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}
