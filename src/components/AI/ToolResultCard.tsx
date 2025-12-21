import {
  CheckCircle2,
  XCircle,
  Calendar,
  Users,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertTriangle,
  FileText,
  DollarSign
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { useState } from 'react';
import { getToolInfo } from '@/lib/ai-agent/tool-metadata';

export interface ToolResultDisplayData {
  summary: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  actions?: Array<{ label: string; action: string }>;
  details?: Record<string, any>;
  items?: Array<{
    name: string;
    status: 'success' | 'failed' | 'skipped';
    message?: string;
  }>;
}

export interface ToolResultData {
  tool: string;
  result: any;
  success: boolean;
  displayData?: ToolResultDisplayData;
}

interface ToolResultCardProps {
  toolResult: ToolResultData;
  onAction?: (action: string) => void;
  className?: string;
}

export function ToolResultCard({ toolResult, onAction, className }: ToolResultCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { tool, result, success, displayData } = toolResult;
  const toolInfo = getToolInfo(tool);
  const Icon = toolInfo.icon;

  // Get card variant based on tool type
  const getCardContent = () => {
    // Use displayData if available
    if (displayData) {
      return <GenericResultCard displayData={displayData} onAction={onAction} />;
    }

    // Otherwise, render based on tool type
    switch (tool) {
      case 'check_team_availability':
        return <AvailabilityCard result={result} onAction={onAction} />;
      case 'auto_schedule_job':
      case 'reschedule_job':
        return <ScheduleConfirmationCard result={result} onAction={onAction} />;
      case 'batch_schedule_jobs':
        return <BatchScheduleCard result={result} onAction={onAction} />;
      case 'get_unscheduled_jobs':
        return <JobListCard result={result} onAction={onAction} />;
      case 'get_scheduling_conflicts':
        return <ConflictCard result={result} onAction={onAction} />;
      case 'create_quote':
      case 'create_invoice':
        return <DocumentCreatedCard result={result} tool={tool} onAction={onAction} />;
      case 'record_payment':
        return <PaymentCard result={result} onAction={onAction} />;
      default:
        return <DefaultResultCard result={result} tool={tool} success={success} />;
    }
  };

  return (
    <div className={cn(
      'rounded-lg border overflow-hidden',
      success ? 'border-primary/20 bg-primary/5' : 'border-destructive/20 bg-destructive/5',
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={cn(
            'p-1.5 rounded-full',
            success ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'
          )}>
            {success ? <Icon className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
          </div>
          <span className="text-xs font-medium">{toolInfo.label}</span>
          {success && <CheckCircle2 className="w-3 h-3 text-primary" />}
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-border/50">
          {getCardContent()}
        </div>
      )}
    </div>
  );
}

// Generic result card for displayData format
function GenericResultCard({ 
  displayData, 
  onAction 
}: { 
  displayData: ToolResultDisplayData; 
  onAction?: (action: string) => void;
}) {
  return (
    <div className="pt-3 space-y-3">
      <p className="text-sm font-medium">{displayData.summary}</p>
      
      {displayData.items && displayData.items.length > 0 && (
        <div className="space-y-1.5">
          {displayData.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              {item.status === 'success' && <CheckCircle2 className="w-3 h-3 text-primary" />}
              {item.status === 'failed' && <XCircle className="w-3 h-3 text-destructive" />}
              {item.status === 'skipped' && <AlertTriangle className="w-3 h-3 text-yellow-500" />}
              <span className={cn(
                item.status === 'failed' && 'text-destructive',
                item.status === 'skipped' && 'text-muted-foreground'
              )}>
                {item.name}
              </span>
              {item.message && (
                <span className="text-muted-foreground">- {item.message}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {displayData.actions && displayData.actions.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {displayData.actions.map((action, idx) => (
            <Button
              key={idx}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onAction?.(action.action)}
            >
              {action.label}
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// Availability card showing team members
function AvailabilityCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const available = result?.available || [];
  const busy = result?.busy || [];
  const date = result?.date;

  return (
    <div className="pt-3 space-y-3">
      {date && (
        <p className="text-xs text-muted-foreground">
          <Calendar className="w-3 h-3 inline mr-1" />
          {format(new Date(date), 'EEEE, MMM d, yyyy')}
        </p>
      )}
      
      {available.length > 0 && (
        <div>
          <p className="text-xs font-medium text-primary mb-1.5 flex items-center gap-1">
            <Users className="w-3 h-3" />
            Available ({available.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((member: any, idx: number) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
              >
                {member.name || member.full_name || member}
              </span>
            ))}
          </div>
        </div>
      )}

      {busy.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1.5">
            Busy ({busy.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {busy.map((member: any, idx: number) => (
              <span
                key={idx}
                className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
              >
                {member.name || member.full_name || member}
                {member.reason && ` - ${member.reason}`}
              </span>
            ))}
          </div>
        </div>
      )}

      {onAction && available.length > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onAction(`Schedule with ${available[0]?.name || available[0]?.full_name || 'available team member'}`)}
        >
          <Calendar className="w-3 h-3 mr-1" />
          Schedule with Available
        </Button>
      )}
    </div>
  );
}

// Schedule confirmation card
function ScheduleConfirmationCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const job = result?.job || result;
  const scheduledTime = job?.starts_at || job?.scheduled_time;
  const title = job?.title || result?.job_title || 'Job';
  const address = job?.address;
  const assignee = job?.assignee || result?.assigned_to;

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">{title}</p>
          {scheduledTime && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              {format(new Date(scheduledTime), 'EEE, MMM d')} at {format(new Date(scheduledTime), 'h:mm a')}
            </p>
          )}
          {assignee && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3" />
              {assignee}
            </p>
          )}
          {address && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" />
              {address}
            </p>
          )}
        </div>
      </div>

      {onAction && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onAction(`navigate_to_calendar?date=${scheduledTime?.split('T')[0]}`)}
          >
            <Calendar className="w-3 h-3 mr-1" />
            View on Calendar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onAction(`navigate_to_entity?type=job&id=${job?.id}`)}
          >
            View Job
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Batch schedule results card
function BatchScheduleCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const scheduled = result?.scheduled || result?.success || [];
  const failed = result?.failed || result?.errors || [];
  const total = result?.total || (scheduled.length + failed.length);

  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">{scheduled.length} scheduled</span>
        </div>
        {failed.length > 0 && (
          <div className="flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-yellow-500">{failed.length} need attention</span>
          </div>
        )}
      </div>

      {scheduled.length > 0 && scheduled.length <= 5 && (
        <div className="space-y-1">
          {scheduled.slice(0, 5).map((job: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="w-3 h-3 text-primary" />
              <span>{job.title || job.job_title || `Job ${idx + 1}`}</span>
              {job.scheduled_time && (
                <span className="text-muted-foreground">
                  - {format(new Date(job.scheduled_time), 'EEE h:mm a')}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {failed.length > 0 && (
        <div className="space-y-1">
          {failed.slice(0, 3).map((job: any, idx: number) => (
            <div key={idx} className="flex items-center gap-2 text-xs text-destructive">
              <XCircle className="w-3 h-3" />
              <span>{job.title || job.job_title || `Job ${idx + 1}`}</span>
              {job.reason && <span className="text-muted-foreground">- {job.reason}</span>}
            </div>
          ))}
        </div>
      )}

      {onAction && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onAction('navigate_to_calendar')}
        >
          <Calendar className="w-3 h-3 mr-1" />
          View Calendar
        </Button>
      )}
    </div>
  );
}

// Job list card
function JobListCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const jobs = result?.jobs || result || [];
  const count = Array.isArray(jobs) ? jobs.length : 0;

  return (
    <div className="pt-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Found {count} unscheduled job{count !== 1 ? 's' : ''}
      </p>

      {count > 0 && count <= 5 && (
        <div className="space-y-1">
          {jobs.slice(0, 5).map((job: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between text-xs py-1">
              <span className="font-medium">{job.title || `Job ${idx + 1}`}</span>
              {onAction && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-xs px-2"
                  onClick={() => onAction(`Schedule job "${job.title}" (ID: ${job.id})`)}
                >
                  Schedule
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {count > 5 && onAction && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs w-full"
          onClick={() => onAction('Schedule all pending jobs')}
        >
          Schedule All {count} Jobs
        </Button>
      )}
    </div>
  );
}

// Conflict card
function ConflictCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const conflicts = result?.conflicts || result || [];
  const count = Array.isArray(conflicts) ? conflicts.length : 0;

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        <span className="text-sm font-medium">{count} conflict{count !== 1 ? 's' : ''} found</span>
      </div>

      {count > 0 && count <= 3 && (
        <div className="space-y-1.5">
          {conflicts.slice(0, 3).map((conflict: any, idx: number) => (
            <div key={idx} className="text-xs p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
              <p className="font-medium">{conflict.job_title || `Job ${idx + 1}`}</p>
              <p className="text-muted-foreground">{conflict.reason || conflict.message}</p>
            </div>
          ))}
        </div>
      )}

      {onAction && count > 0 && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs"
          onClick={() => onAction('Help me resolve these conflicts')}
        >
          Resolve Conflicts
        </Button>
      )}
    </div>
  );
}

// Document created card (quote/invoice)
function DocumentCreatedCard({ 
  result, 
  tool,
  onAction 
}: { 
  result: any; 
  tool: string;
  onAction?: (action: string) => void;
}) {
  const docType = tool === 'create_quote' ? 'Quote' : 'Invoice';
  const number = result?.number || result?.quote_number || result?.invoice_number;
  const total = result?.total;
  const customerName = result?.customer_name || result?.customer?.name;

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-start gap-2">
        <FileText className="w-4 h-4 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">{docType} {number ? `#${number}` : 'Created'}</p>
          {customerName && (
            <p className="text-xs text-muted-foreground">For {customerName}</p>
          )}
          {total !== undefined && (
            <p className="text-xs font-medium text-primary mt-0.5">
              <DollarSign className="w-3 h-3 inline" />
              {total.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          )}
        </div>
      </div>

      {onAction && (
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => onAction(`Send ${docType.toLowerCase()} to customer`)}
          >
            Send {docType}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs"
            onClick={() => onAction(`navigate_to_entity?type=${tool === 'create_quote' ? 'quote' : 'invoice'}&id=${result?.id}`)}
          >
            View
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}

// Payment card
function PaymentCard({ 
  result, 
  onAction 
}: { 
  result: any; 
  onAction?: (action: string) => void;
}) {
  const amount = result?.amount;
  const method = result?.method;
  const invoiceNumber = result?.invoice_number;

  return (
    <div className="pt-3 space-y-2">
      <div className="flex items-start gap-2">
        <DollarSign className="w-4 h-4 text-primary mt-0.5" />
        <div>
          <p className="text-sm font-medium">Payment Recorded</p>
          {amount !== undefined && (
            <p className="text-xs font-medium text-primary">
              {amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
            </p>
          )}
          {method && (
            <p className="text-xs text-muted-foreground capitalize">{method}</p>
          )}
          {invoiceNumber && (
            <p className="text-xs text-muted-foreground">Invoice #{invoiceNumber}</p>
          )}
        </div>
      </div>

      {onAction && invoiceNumber && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs"
          onClick={() => onAction(`navigate_to_entity?type=invoice&id=${result?.invoice_id}`)}
        >
          View Invoice
          <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

// Default result card for unknown tools
function DefaultResultCard({ 
  result, 
  tool,
  success 
}: { 
  result: any; 
  tool: string;
  success: boolean;
}) {
  const toolInfo = getToolInfo(tool);
  
  // Try to extract a meaningful summary from the result
  let summary = '';
  if (typeof result === 'string') {
    summary = result;
  } else if (result?.message) {
    summary = result.message;
  } else if (result?.success !== undefined) {
    summary = result.success ? 'Completed successfully' : 'Action failed';
  } else if (Array.isArray(result)) {
    summary = `Found ${result.length} item${result.length !== 1 ? 's' : ''}`;
  } else {
    summary = success ? 'Completed' : 'Failed';
  }

  return (
    <div className="pt-3">
      <div className="flex items-center gap-2">
        {success ? (
          <CheckCircle2 className="w-4 h-4 text-primary" />
        ) : (
          <XCircle className="w-4 h-4 text-destructive" />
        )}
        <span className="text-sm">{summary}</span>
      </div>
    </div>
  );
}

