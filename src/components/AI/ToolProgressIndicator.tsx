import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToolInfo } from '@/lib/ai-agent/tool-metadata';
import { useEffect, useState } from 'react';

interface ToolProgressIndicatorProps {
  toolName: string;
  progress?: { current: number; total: number };
  className?: string;
}

export function ToolProgressIndicator({ toolName, progress, className }: ToolProgressIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const toolInfo = getToolInfo(toolName);
  const ToolIcon = toolInfo.icon;

  // Track elapsed time for long-running tools
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [toolName]);

  // Tool-specific status messages with more context
  const getStatusMessage = () => {
    switch (toolName) {
      case 'check_team_availability':
        return 'Checking who\'s available...';
      case 'batch_schedule_jobs':
        if (progress) {
          return `Scheduling job ${progress.current} of ${progress.total}...`;
        }
        return 'Scheduling jobs...';
      case 'auto_schedule_job':
        return 'Finding the best time slot...';
      case 'get_unscheduled_jobs':
        return 'Finding pending jobs...';
      case 'optimize_route_for_date':
        return 'Calculating optimal route...';
      case 'create_quote':
        return 'Creating quote...';
      case 'create_invoice':
        return 'Creating invoice...';
      case 'send_quote':
      case 'send_invoice':
        return 'Sending email...';
      case 'get_schedule_summary':
        return 'Fetching schedule...';
      case 'get_customer_details':
        return 'Loading customer info...';
      case 'search_customers':
        return 'Searching customers...';
      default:
        return toolInfo.label + '...';
    }
  };

  return (
    <div className={cn('flex gap-3 mb-4 animate-fade-in', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      {/* Progress content */}
      <div className="flex-1 min-w-0">
        <div className="inline-flex flex-col gap-2 rounded-2xl px-4 py-3 bg-muted">
          {/* Tool info row */}
          <div className="flex items-center gap-3">
            {/* Tool icon with spinner */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <ToolIcon className="w-4 h-4 text-primary" />
              </div>
              <Loader2 className="absolute -top-0.5 -right-0.5 w-3 h-3 text-primary animate-spin" />
            </div>
            
            {/* Status text */}
            <div>
              <p className="text-sm font-medium text-foreground">
                {getStatusMessage()}
              </p>
              {elapsed > 3 && (
                <p className="text-xs text-muted-foreground">
                  {elapsed}s elapsed
                </p>
              )}
            </div>
          </div>

          {/* Progress bar for batch operations */}
          {progress && progress.total > 1 && (
            <div className="w-48">
              <div className="h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-center">
                {progress.current} / {progress.total}
              </p>
            </div>
          )}

          {/* Animated dots for visual feedback */}
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
