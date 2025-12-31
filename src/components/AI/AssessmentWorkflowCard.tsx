import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedProgress, AnimatedNumber } from '@/components/ui/animated-progress';
import { feedback } from '@/utils/feedback';
import { 
  ClipboardList,
  Calendar,
  MapPin,
  Camera,
  AlertTriangle,
  FileText,
  Check,
  Circle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  RotateCcw,
  Image,
  Flag
} from 'lucide-react';

export interface AssessmentWorkflowStep {
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

export interface AssessmentAutomationSummary {
  checklistCreated?: boolean;
  checklistItemCount?: number;
  photosUploaded?: number;
  risksIdentified?: number;
  reportGenerated?: boolean;
  estimateCreated?: boolean;
}

export interface AssessmentWorkflowCardProps {
  steps: AssessmentWorkflowStep[];
  currentStepIndex: number;
  assessmentData?: {
    customerName?: string;
    address?: string;
    scheduledDate?: string;
    assignedTo?: string;
    photoCount?: number;
    checklistProgress?: number;
    riskCount?: number;
  };
  automationSummary?: AssessmentAutomationSummary;
  onPrompt?: (prompt: string) => void;
  isExpanded?: boolean;
}

const STEP_ICONS: Record<string, typeof ClipboardList> = {
  'create_request': ClipboardList,
  'create_assessment_job': Calendar,
  'check_team_availability': MapPin,
  'assign_job': MapPin,
  'create_checklist': ClipboardList,
  'complete_checklist_item': Check,
  'upload_media': Camera,
  'tag_media': Flag,
  'analyze_photo': AlertTriangle,
  'generate_summary': FileText,
  'create_quote': FileText,
};

const STEP_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  'search_customers': [
    { label: 'Search by phone', prompt: "Search for the customer by phone number" },
    { label: 'Search by email', prompt: "Search for the customer by email" },
    { label: 'New customer', prompt: "This is a new customer" },
  ],
  'create_customer': [
    { label: 'Add phone', prompt: "Add a phone number for this customer" },
    { label: 'Add address', prompt: "Add the address details for this customer" },
  ],
  'create_request': [
    { label: 'Service details', prompt: "What type of service does this assessment need?" },
    { label: 'Add notes', prompt: "Add notes about the assessment request" },
  ],
  'check_team_availability': [
    { label: 'Check another date', prompt: "Check availability for a different date" },
    { label: 'Assign manually', prompt: "Let me choose who to assign this assessment to" },
  ],
  'create_assessment_job': [
    { label: 'Add access instructions', prompt: "Add access instructions for this assessment" },
    { label: 'Schedule for specific time', prompt: "Schedule this assessment for a specific time" },
  ],
  'assign_job': [
    { label: 'Reassign', prompt: "Assign this assessment to a different team member" },
    { label: 'Add backup', prompt: "Add a backup team member for this assessment" },
  ],
  'send_job_confirmation': [
    { label: 'Customize message', prompt: "Customize the confirmation message" },
    { label: 'Add reminder', prompt: "Set a reminder for this assessment" },
  ],
  'upload_media': [
    { label: 'Add more photos', prompt: "I need to add more photos to this assessment" },
    { label: 'Add annotations', prompt: "Help me annotate these photos" },
  ],
  'analyze_photo': [
    { label: 'Flag a risk', prompt: "I want to flag a risk I noticed during the assessment" },
    { label: 'Add opportunity note', prompt: "Note an upsell opportunity from this assessment" },
  ],
  'generate_summary': [
    { label: 'Create quote', prompt: "Create a quote from this assessment" },
    { label: 'Export report', prompt: "Export the assessment report as PDF" },
  ],
};

// Detect missing context for each step and show prompts
const getMissingContextPrompts = (step: AssessmentWorkflowStep, assessmentData?: AssessmentWorkflowCardProps['assessmentData']): { label: string; prompt: string; urgent: boolean }[] => {
  const missing: { label: string; prompt: string; urgent: boolean }[] = [];
  
  switch (step.tool) {
    case 'search_customers':
    case 'create_customer':
      if (!assessmentData?.customerName) {
        missing.push({ label: 'Add customer name', prompt: "What is the customer's name?", urgent: true });
      }
      break;
    case 'create_request':
    case 'create_assessment_job':
      if (!assessmentData?.address) {
        missing.push({ label: 'Add address', prompt: "What is the assessment address?", urgent: true });
      }
      break;
    case 'check_team_availability':
      if (!assessmentData?.scheduledDate) {
        missing.push({ label: 'Set date', prompt: "What date should I check availability for?", urgent: true });
      }
      break;
  }
  
  return missing;
};

export function AssessmentWorkflowCard({ 
  steps, 
  currentStepIndex, 
  assessmentData,
  automationSummary,
  onPrompt,
  isExpanded: initialExpanded = true 
}: AssessmentWorkflowCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const prevStepsRef = useRef<AssessmentWorkflowStep[]>([]);
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
  
  const getStatusIcon = (step: AssessmentWorkflowStep, index: number) => {
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
    <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-base font-semibold">Site Assessment Workflow</CardTitle>
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
        
        {/* Assessment summary when collapsed */}
        {!isExpanded && assessmentData?.customerName && (
          <div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
            <span className="font-medium">{assessmentData.customerName}</span>
            {assessmentData.photoCount !== undefined && assessmentData.photoCount > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Image className="w-3 h-3" />
                {assessmentData.photoCount}
              </Badge>
            )}
            {assessmentData.riskCount !== undefined && assessmentData.riskCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="w-3 h-3" />
                {assessmentData.riskCount}
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
                    isActive && "bg-amber-500/10",
                    step.status === 'completed' && "opacity-70"
                  )}
                >
                  {/* Status icon with pulse animation on complete */}
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                    step.status === 'completed' && "bg-amber-500/20 animate-pulse-once",
                    step.status === 'in_progress' && "bg-amber-500/20",
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
                    
                    {/* Result summary with context-specific display */}
                    {step.status === 'completed' && step.result && (
                      <div className="text-xs text-amber-600 mt-1 font-medium animate-fade-in-up">
                        {step.tool === 'create_assessment_job' && step.result.id && (
                          <>Assessment scheduled{step.result.starts_at ? ` for ${new Date(step.result.starts_at).toLocaleDateString()}` : ''}</>
                        )}
                        {step.tool === 'upload_media' && step.result.count !== undefined && (
                          <><AnimatedNumber value={step.result.count} /> photos uploaded</>
                        )}
                        {step.tool === 'tag_media' && step.result.risk_count !== undefined && (
                          <><AnimatedNumber value={step.result.risk_count} /> risks flagged</>
                        )}
                        {step.tool === 'generate_summary' && step.result.summary && (
                          <>Report generated</>
                        )}
                        {step.tool === 'assign_job' && step.result.assigned_to && (
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
                    
                    {/* Missing context prompts (urgent) */}
                    {isActive && onPrompt && (
                      <>
                        {getMissingContextPrompts(step, assessmentData).map((p) => (
                          <Button
                            key={p.label}
                            variant="destructive"
                            size="sm"
                            className="h-6 text-[11px] px-2 mt-2 mr-1 active:scale-95 transition-transform"
                            onClick={() => {
                              feedback.tap();
                              onPrompt(p.prompt);
                            }}
                          >
                            ⚠️ {p.label}
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        ))}
                      </>
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
            <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                <Check className="w-4 h-4" />
                Assessment completed successfully!
              </div>
              {assessmentData && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  {assessmentData.customerName && <div>Customer: {assessmentData.customerName}</div>}
                  {assessmentData.address && <div>Location: {assessmentData.address}</div>}
                  {assessmentData.photoCount !== undefined && <div>Photos: {assessmentData.photoCount}</div>}
                  {assessmentData.riskCount !== undefined && <div>Risks Identified: {assessmentData.riskCount}</div>}
                </div>
              )}
              {onPrompt && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Create a quote from this assessment");
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
                      onPrompt("Export the assessment report");
                    }}
                  >
                    Export Report
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Schedule the follow-up job");
                    }}
                  >
                    Schedule Job
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
              {automationSummary.checklistCreated && (
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>Checklist auto-created with {automationSummary.checklistItemCount} items</span>
                </div>
              )}
              {automationSummary.photosUploaded !== undefined && automationSummary.photosUploaded > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <Camera className="w-3 h-3 text-green-500" />
                  <span>{automationSummary.photosUploaded} photos auto-tagged as "before"</span>
                </div>
              )}
              {automationSummary.risksIdentified !== undefined && automationSummary.risksIdentified > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-3 h-3 text-red-500" />
                  <span>{automationSummary.risksIdentified} risks auto-detected from photos</span>
                </div>
              )}
              {automationSummary.reportGenerated && (
                <div className="flex items-center gap-2 text-xs">
                  <FileText className="w-3 h-3 text-blue-500" />
                  <span>Assessment report auto-generated</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
