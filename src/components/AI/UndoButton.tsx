import { Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface UndoButtonProps {
  actionId: string;
  actionDescription: string;
  onUndo: (message: string) => void;
  className?: string;
}

export function UndoButton({ actionId, actionDescription, onUndo, className }: UndoButtonProps) {
  const handleUndo = () => {
    onUndo(`Undo the last action: ${actionDescription}`);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground',
        className
      )}
      onClick={handleUndo}
    >
      <Undo2 className="w-3 h-3" />
      Undo
    </Button>
  );
}

// Determine if an action is reversible based on tool name
export function isReversibleAction(toolName: string): boolean {
  const reversibleTools = [
    // Status updates
    'update_job_status',
    'update_job',
    'update_customer',
    'update_quote',
    
    // Scheduling
    'reschedule_job',
    'auto_schedule_job',
    'batch_schedule_jobs',
    
    // Assignments
    'assign_team_member',
    
    // Time tracking
    'clock_in',
    'clock_out',
    
    // Approvals (can be unapproved)
    'approve_quote',
    'approve_time_off',
  ];

  return reversibleTools.includes(toolName);
}

// Get undo description based on tool and result
export function getUndoDescription(toolName: string, result?: any): string {
  const descriptions: Record<string, string> = {
    update_job_status: 'status change',
    update_job: 'job update',
    update_customer: 'customer update',
    update_quote: 'quote update',
    reschedule_job: 'reschedule',
    auto_schedule_job: 'auto-schedule',
    batch_schedule_jobs: 'batch schedule',
    assign_team_member: 'team assignment',
    clock_in: 'clock in',
    clock_out: 'clock out',
    approve_quote: 'quote approval',
    approve_time_off: 'time off approval',
  };

  return descriptions[toolName] || toolName.replace(/_/g, ' ');
}
