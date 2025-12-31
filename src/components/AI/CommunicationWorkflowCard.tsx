import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AnimatedProgress, AnimatedNumber } from '@/components/ui/animated-progress';
import { feedback } from '@/utils/feedback';
import { 
  MessageSquare,
  Database,
  Send,
  Bell,
  Mail,
  Check,
  Circle,
  ArrowRight,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Zap,
  RotateCcw,
  User,
  Clock
} from 'lucide-react';

export interface CommunicationWorkflowStep {
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

export interface CommunicationAutomationSummary {
  conversationCreated?: boolean;
  conversationId?: string;
  messageSent?: boolean;
  messageId?: string;
  emailQueued?: boolean;
  emailScheduledFor?: string;
  statusUpdateSent?: boolean;
}

export interface CommunicationWorkflowCardProps {
  steps: CommunicationWorkflowStep[];
  currentStepIndex: number;
  communicationData?: {
    customerName?: string;
    customerEmail?: string;
    conversationTitle?: string;
    messagePreview?: string;
    channel?: 'portal' | 'email' | 'both';
  };
  automationSummary?: CommunicationAutomationSummary;
  onPrompt?: (prompt: string) => void;
  isExpanded?: boolean;
}

const STEP_ICONS: Record<string, typeof MessageSquare> = {
  'get_or_create_conversation': MessageSquare,
  'create_conversation': MessageSquare,
  'get_customer': Database,
  'get_conversation_details': Database,
  'send_message': Send,
  'send_email': Mail,
  'queue_email': Clock,
  'send_status_update': Bell,
};

const STEP_PROMPTS: Record<string, { label: string; prompt: string }[]> = {
  'get_or_create_conversation': [
    { label: 'New conversation', prompt: "Start a new conversation with this customer" },
    { label: 'View history', prompt: "Show me the conversation history with this customer" },
  ],
  'send_message': [
    { label: 'Use template', prompt: "Use a message template" },
    { label: 'Add attachment', prompt: "I want to attach a file to this message" },
  ],
  'send_email': [
    { label: 'Preview email', prompt: "Let me preview the email before sending" },
    { label: 'Schedule send', prompt: "Schedule this email for later" },
  ],
  'queue_email': [
    { label: 'Send now', prompt: "Send this email immediately instead of scheduling" },
    { label: 'Change timing', prompt: "Change when this email should be sent" },
  ],
};

export function CommunicationWorkflowCard({ 
  steps, 
  currentStepIndex, 
  communicationData,
  automationSummary,
  onPrompt,
  isExpanded: initialExpanded = true 
}: CommunicationWorkflowCardProps) {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const prevStepsRef = useRef<CommunicationWorkflowStep[]>([]);
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
  
  const getStatusIcon = (step: CommunicationWorkflowStep) => {
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
    <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-base font-semibold">Communication Workflow</CardTitle>
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
        
        {/* Communication summary when collapsed */}
        {!isExpanded && communicationData?.customerName && (
          <div className="flex items-center gap-2 mt-2 text-sm flex-wrap">
            <User className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium">{communicationData.customerName}</span>
            {communicationData.channel && (
              <Badge variant="secondary" className="text-[10px]">
                {communicationData.channel === 'both' ? 'Portal + Email' : communicationData.channel}
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
                    isActive && "bg-blue-500/10",
                    step.status === 'completed' && "opacity-70"
                  )}
                >
                  {/* Status icon with pulse animation on complete */}
                  <div className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200",
                    step.status === 'completed' && "bg-blue-500/20 animate-pulse-once",
                    step.status === 'in_progress' && "bg-blue-500/20",
                    step.status === 'failed' && "bg-destructive/20",
                    step.status === 'pending' && "bg-muted"
                  )}>
                    {getStatusIcon(step)}
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
                      <div className="text-xs text-blue-600 mt-1 font-medium animate-fade-in-up">
                        {step.tool === 'get_or_create_conversation' && step.result.id && (
                          <>Conversation ready</>
                        )}
                        {step.tool === 'create_conversation' && step.result.id && (
                          <>New conversation created</>
                        )}
                        {step.tool === 'send_message' && step.result.id && (
                          <>Message sent successfully</>
                        )}
                        {step.tool === 'send_email' && step.result.status && (
                          <>Email {step.result.status}</>
                        )}
                        {step.tool === 'queue_email' && step.result.scheduled_for && (
                          <>Scheduled for {new Date(step.result.scheduled_for).toLocaleString()}</>
                        )}
                        {step.tool === 'get_customer' && step.result.name && (
                          <>Retrieved: {step.result.name}</>
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
            <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
                <Check className="w-4 h-4" />
                Communication sent successfully!
              </div>
              {communicationData && (
                <div className="mt-2 text-xs text-muted-foreground space-y-1">
                  {communicationData.customerName && <div>To: {communicationData.customerName}</div>}
                  {communicationData.channel && <div>Channel: {communicationData.channel === 'both' ? 'Portal + Email' : communicationData.channel}</div>}
                  {communicationData.messagePreview && (
                    <div className="truncate">Message: {communicationData.messagePreview}</div>
                  )}
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
                      onPrompt("Schedule a site assessment for this customer");
                    }}
                  >
                    Schedule Assessment
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs active:scale-95 transition-transform"
                    onClick={() => {
                      feedback.tap();
                      onPrompt("Create a quote for this customer");
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
                      onPrompt("Send another message to this customer");
                    }}
                  >
                    Send Another
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
              {automationSummary.conversationCreated && (
                <div className="flex items-center gap-2 text-xs">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span>Conversation created</span>
                </div>
              )}
              {automationSummary.messageSent && (
                <div className="flex items-center gap-2 text-xs">
                  <Send className="w-3 h-3 text-green-500" />
                  <span>Message delivered to customer</span>
                </div>
              )}
              {automationSummary.emailQueued && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3 h-3 text-amber-500" />
                  <span>
                    Email queued
                    {automationSummary.emailScheduledFor && ` for ${new Date(automationSummary.emailScheduledFor).toLocaleString()}`}
                  </span>
                </div>
              )}
              {automationSummary.statusUpdateSent && (
                <div className="flex items-center gap-2 text-xs">
                  <Zap className="w-3 h-3 text-purple-500" />
                  <span>Status update sent automatically</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
