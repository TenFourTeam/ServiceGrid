import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedProgress, AnimatedNumber } from '@/components/ui/animated-progress';
import { feedback } from '@/utils/feedback';
import { 
  UserPlus, 
  Search, 
  FileText, 
  TrendingUp, 
  Users, 
  Mail,
  Check,
  Circle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  RotateCcw
} from 'lucide-react';

export interface LeadWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  tool?: string;
  result?: any;
  error?: string;
  verification?: {
    phase: string;
    failedAssertion?: string;
    recoverySuggestion?: string;
  };
  rollbackExecuted?: boolean;
  rollbackTool?: string;
}

export interface AutomationSummary {
  leadScored?: boolean;
  leadScore?: number;
  autoAssigned?: boolean;
  assignedTo?: string;
  emailQueued?: boolean;
  emailDelay?: number;
}

export interface LeadWorkflowCardProps {
  steps: LeadWorkflowStep[];
  currentStepIndex: number;
  customerData?: {
    name?: string;
    email?: string;
    phone?: string;
    leadScore?: number;
    leadSource?: string;
  };
  automationSummary?: AutomationSummary;
  onPrompt?: (prompt: string) => void;
  isExpanded?: boolean;
}

const STEP_ICONS: Record<string, typeof UserPlus> = {
  'search_customers': Search,
  'create_customer': UserPlus,
  'create_request': FileText,
  'score_lead': TrendingUp,
  'check_team_availability': Users,
  'auto_assign_lead': Users,
  'send_email': Mail,
  'create_quote': FileText,
};

const STEP_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  'create_customer': [
    { label: 'Add phone number', prompt: "Add phone number for this lead" },
    { label: 'Add address', prompt: "Add address for this lead" },
  ],
  'create_request': [
    { label: 'Add service details', prompt: "Add more details about their service needs" },
  ],
  'auto_assign_lead': [
    { label: 'Assign manually', prompt: "Let me choose who to assign this lead to" },
  ],
};

export function LeadWorkflowCard({ 
  steps, 
  currentStepIndex, 
  customerData,
  automationSummary,
  onPrompt,
  isExpanded: initialExpanded = true 
}: LeadWorkflowCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const prevStepsRef = useRef<LeadWorkflowStep[]>([]);
  const prevCompleteRef = useRef(false);
  
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const isComplete = completedSteps === steps.length;
  
  // Trigger haptic feedback on step completion
  useEffect(() => {
    const justCompleted = steps.find(s => 
      s.status === 'completed' && 
      prevStepsRef.current.find(p => p.id === s.id)?.status !== 'completed'
    );
    
    if (justCompleted) {
      feedback.stepComplete();
    }
    
    if (isComplete && !prevCompleteRef.current) {
      feedback.workflowComplete();
    }
    
    prevStepsRef.current = steps;
    prevCompleteRef.current = isComplete;
  }, [steps, isComplete]);
  
  const getStatusIcon = (step: LeadWorkflowStep, index: number) => {
    const StepIcon = STEP_ICONS[step.tool || ''] || Circle;
    
    switch (step.status) {
      case 'completed':
        return <Check className="w-4 h-4 text-primary" />;
      case 'in_progress':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
      case 'skipped':
        return <Circle className="w-4 h-4 text-muted-foreground" />;
      default:
        return <StepIcon className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <CardTitle className="text-base font-semibold">Lead Capture Workflow</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-7 w-7 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        
        {/* Progress bar - animated */}
        <div className="flex items-center gap-3 mt-2">
          <AnimatedProgress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground font-medium tabular-nums">
            {completedSteps}/{steps.length}
          </span>
        </div>
        
        {/* Customer summary when collapsed */}
        {!isExpanded && customerData?.name && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            <span className="font-medium">{customerData.name}</span>
            {customerData.leadScore !== undefined && (
              <Badge variant={customerData.leadScore >= 70 ? 'default' : customerData.leadScore >= 40 ? 'secondary' : 'outline'}>
                Score: {customerData.leadScore}
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0">
          {/* Steps list */}
          <div className="space-y-2">
            {steps.map((step, index) => {
              const isActive = index === currentStepIndex;
              const prompts = STEP_PROMPTS[step.tool || ''];
              
              return (
                <div 
                  key={step.id}
                  className={cn(
                    "flex items-start gap-3 p-2 rounded-lg transition-colors",
                    isActive && "bg-primary/10",
                    step.status === 'completed' && "opacity-70"
                  )}
                >
                  {/* Status icon with pulse animation on complete */}
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                    step.status === 'completed' && "bg-primary/20 animate-pulse-once",
                    step.status === 'in_progress' && "bg-primary/20",
                    step.status === 'failed' && "bg-destructive/20",
                    step.status === 'pending' && "bg-muted"
                  )}>
                    {getStatusIcon(step, index)}
                  </div>
                  
                  {/* Step content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-medium",
                        step.status === 'completed' && "text-muted-foreground line-through",
                        step.status === 'failed' && "text-destructive"
                      )}>
                        {step.name}
                      </span>
                      {step.status === 'skipped' && (
                        <Badge variant="outline" className="text-[10px] h-4">Skipped</Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {step.description}
                    </p>
                    
                    {/* Result summary with animated score */}
                    {step.status === 'completed' && step.result && (
                      <div className="text-xs text-primary mt-1 font-medium animate-fade-in-up">
                        {step.tool === 'score_lead' && step.result.score !== undefined && (
                          <>Lead Score: <AnimatedNumber value={step.result.score} suffix="/100" /></>
                        )}
                        {step.tool === 'create_customer' && step.result.customer_id && (
                          <>Customer created successfully</>
                        )}
                        {step.tool === 'create_request' && step.result.request_id && (
                          <>Request logged</>
                        )}
                        {step.tool === 'auto_assign_lead' && step.result.assigned_to && (
                          <>Assigned to {step.result.assigned_to_name || 'team member'}</>
                        )}
                      </div>
                    )}
                    
                    {/* Error message */}
                    {step.status === 'failed' && step.error && (
                      <p className="text-xs text-destructive mt-1">{step.error}</p>
                    )}
                    
                    {/* Verification failure details */}
                    {step.status === 'failed' && step.verification && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded border border-destructive/20 text-xs space-y-1">
                        <p className="font-medium text-destructive">
                          Verification failed: {step.verification.phase}
                        </p>
                        {step.verification.failedAssertion && (
                          <p className="text-muted-foreground">{step.verification.failedAssertion}</p>
                        )}
                        {step.verification.recoverySuggestion && (
                          <p className="text-primary flex items-center gap-1">
                            💡 {step.verification.recoverySuggestion}
                          </p>
                        )}
                        {step.rollbackExecuted && (
                          <p className="text-amber-600 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" />
                            Rolled back: {step.rollbackTool?.replace(/_/g, ' ')}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* Contextual prompts with press feedback */}
                    {isActive && prompts && onPrompt && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prompts.map((p) => (
                          <Button
                            key={p.label}
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2 active:scale-95 transition-transform"
                            onClick={() => {
                              feedback.tap();
                              onPrompt(p.prompt);
                            }}
                          >
                            {p.label}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Completion message */}
          {isComplete && (
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Check className="w-4 h-4" />
                Lead captured successfully!
              </div>
              {customerData && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  {customerData.name && <div>Customer: {customerData.name}</div>}
                  {customerData.leadScore !== undefined && <div>Lead Score: {customerData.leadScore}/100</div>}
                </div>
              )}
              {onPrompt && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button 
                    variant="default" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Start a conversation with this customer");
                    }}
                  >
                    Contact Customer
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Create a quote for this lead");
                    }}
                  >
                    Create Quote
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Schedule an assessment for this lead");
                    }}
                  >
                    Schedule Assessment
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Automation Summary - shows what triggers did after workflow completes */}
          {isComplete && automationSummary && (
            <div className="mt-3 p-3 rounded-lg bg-muted/50 border border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Automation Summary
              </p>
              {automationSummary.leadScored && (
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Lead auto-scored at {automationSummary.leadScore}/100</span>
                </div>
              )}
              {automationSummary.autoAssigned && (
                <div className="flex items-center gap-2 text-xs">
                  <Users className="w-3 h-3 text-green-500" />
                  <span>Auto-assigned to {automationSummary.assignedTo}</span>
                </div>
              )}
              {automationSummary.emailQueued && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3 h-3 text-blue-500" />
                  <span>
                    Welcome email queued
                    {automationSummary.emailDelay ? ` (${automationSummary.emailDelay} min)` : ''}
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
