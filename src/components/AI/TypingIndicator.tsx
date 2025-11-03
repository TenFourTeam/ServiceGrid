import { Bot, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  toolName?: string | null;
  className?: string;
}

const toolStatusMessages: Record<string, string> = {
  get_unscheduled_jobs: 'Finding unscheduled jobs...',
  check_team_availability: 'Checking team availability...',
  get_schedule_summary: 'Getting schedule summary...',
  auto_schedule_job: 'Auto-scheduling job...',
  create_job_from_request: 'Creating job from request...',
  optimize_route_for_date: 'Optimizing route...',
  get_scheduling_conflicts: 'Finding conflicts...',
  get_customer_details: 'Getting customer details...',
  update_job_status: 'Updating job status...',
  get_capacity_forecast: 'Forecasting capacity...',
  reschedule_job: 'Rescheduling job...',
};

export function TypingIndicator({ toolName, className }: TypingIndicatorProps) {
  const statusMessage = toolName ? toolStatusMessages[toolName] : 'AI is thinking...';

  return (
    <div className={cn('flex gap-3 mb-4', className)}>
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      {/* Typing bubble */}
      <div className="flex-1 min-w-0">
        <div className="inline-block max-w-[85%] rounded-2xl px-4 py-3 bg-muted">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground animate-pulse">
              {statusMessage}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
