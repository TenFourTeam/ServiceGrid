import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Play, 
  X, 
  ChevronDown, 
  ChevronUp,
  ListChecks,
  ArrowRight,
  Clock,
  AlertTriangle,
  Code2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlanStep {
  id: string;
  name: string;
  description: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
}

export interface PlanPreviewData {
  id: string;
  name: string;
  description: string;
  steps: PlanStep[];
  requiresApproval: boolean;
}

interface PlanPreviewCardProps {
  plan: PlanPreviewData;
  onApprove: (message: string) => void;
  onReject: (message: string) => void;
}

// Estimated time per step (in seconds) based on tool type
const TOOL_TIME_ESTIMATES: Record<string, number> = {
  'get_unscheduled_jobs': 2,
  'get_completed_jobs': 2,
  'get_overdue_invoices': 2,
  'get_schedule_summary': 2,
  'get_team_utilization': 2,
  'batch_schedule_jobs': 5,
  'batch_update_job_status': 3,
  'batch_create_invoices': 4,
  'batch_send_reminders': 4,
  'send_job_confirmations': 4,
  'create_invoice': 2,
  'send_invoice': 3,
  'approve_quote': 2,
  'convert_quote_to_job': 2,
  'assign_checklist_to_job': 1,
  'optimize_route_for_date': 3,
  'default': 3,
};

function getStepEstimate(tool: string): number {
  return TOOL_TIME_ESTIMATES[tool] || TOOL_TIME_ESTIMATES['default'];
}

export function PlanPreviewCard({ plan, onApprove, onReject }: PlanPreviewCardProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [showToolNames, setShowToolNames] = useState(false);

  const handleApprove = async () => {
    setIsExecuting(true);
    // Send explicit plan ID in message for reliable matching
    onApprove(`plan_approve:${plan.id}`);
  };

  const handleReject = () => {
    // Send explicit plan ID in message for reliable matching
    onReject(`plan_reject:${plan.id}`);
  };

  // Calculate total estimated time from individual step estimates
  const estimatedTime = plan.steps.reduce((total, step) => total + getStepEstimate(step.tool), 0);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ListChecks className="w-4 h-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">{plan.name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{plan.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {plan.steps.length} steps
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Steps Preview */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="flex-1 justify-between px-2 h-8">
                <span className="text-xs text-muted-foreground">View steps</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-2 gap-1.5 text-xs",
                showToolNames && "text-primary"
              )}
              onClick={() => setShowToolNames(!showToolNames)}
              title="Toggle technical details"
            >
              <Code2 className="w-3.5 h-3.5" />
              {showToolNames ? 'Hide' : 'Show'} tools
            </Button>
          </div>
          
          <CollapsibleContent className="pt-2">
            <div className="space-y-1">
              {plan.steps.map((step, index) => {
                const stepEstimate = getStepEstimate(step.tool);
                
                return (
                  <div
                    key={step.id}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg",
                      "bg-muted/50 border border-transparent",
                      "transition-colors animate-fade-in"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{step.name}</p>
                        <span className="text-xs text-muted-foreground shrink-0">~{stepEstimate}s</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{step.description}</p>
                      {showToolNames && (
                        <p className="text-xs text-primary/70 font-mono mt-0.5 truncate">
                          {step.tool}
                        </p>
                      )}
                    </div>
                    {index < plan.steps.length - 1 && (
                      <ArrowRight className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Estimated time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Clock className="w-3.5 h-3.5" />
          <span>Estimated time: ~{estimatedTime} seconds</span>
        </div>

        {/* Warning for multi-step */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            This will execute multiple actions. Some steps may not be reversible.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleApprove}
            disabled={isExecuting}
            className="flex-1 gap-2"
            size="sm"
          >
            {isExecuting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Execute Plan
              </>
            )}
          </Button>
          <Button
            onClick={handleReject}
            disabled={isExecuting}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}