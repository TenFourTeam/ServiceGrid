import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  AlertCircle
} from 'lucide-react';

export interface LeadWorkflowStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  tool?: string;
  result?: any;
  error?: string;
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
  onPrompt,
  isExpanded: initialExpanded = true 
}: LeadWorkflowCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercent = (completedSteps / steps.length) * 100;
  const isComplete = completedSteps === steps.length;
  
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
        
        {/* Progress bar */}
        <div className="flex items-center gap-3 mt-2">
          <Progress value={progressPercent} className="h-2 flex-1" />
          <span className="text-xs text-muted-foreground font-medium">
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
                  {/* Status icon */}
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center",
                    step.status === 'completed' && "bg-primary/20",
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
                    
                    {/* Result summary */}
                    {step.status === 'completed' && step.result && (
                      <div className="text-xs text-primary mt-1 font-medium">
                        {step.tool === 'score_lead' && step.result.score !== undefined && (
                          <>Lead Score: {step.result.score}/100</>
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
                    
                    {/* Contextual prompts */}
                    {isActive && prompts && onPrompt && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prompts.map((p) => (
                          <Button
                            key={p.label}
                            variant="outline"
                            size="sm"
                            className="h-6 text-[11px] px-2"
                            onClick={() => onPrompt(p.prompt)}
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
                <div className="flex gap-2 mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => onPrompt("Create a quote for this lead")}
                  >
                    Create Quote
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs"
                    onClick={() => onPrompt("Schedule an assessment for this lead")}
                  >
                    Schedule Assessment
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
