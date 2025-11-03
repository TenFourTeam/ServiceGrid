import { useState } from 'react';
import { Message } from '@/hooks/useAIChat';
import { Bot, User, Loader2, CheckCircle2, Calendar, Users, MapPin, Clock, FileText, TrendingUp, AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ActionButton } from './ActionButton';
import { SchedulePreviewCard } from './SchedulePreviewCard';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onActionExecute?: (action: string) => Promise<void>;
  onApproveSchedule?: (scheduleData: any) => Promise<void>;
}

const toolIconMap: Record<string, any> = {
  get_unscheduled_jobs: Calendar,
  check_team_availability: Users,
  get_schedule_summary: FileText,
  auto_schedule_job: Calendar,
  create_job_from_request: FileText,
  optimize_route_for_date: MapPin,
  get_scheduling_conflicts: AlertCircle,
  get_customer_details: Users,
  update_job_status: CheckCircle2,
  get_capacity_forecast: TrendingUp,
  reschedule_job: RefreshCw,
  batch_schedule_jobs: Zap,
  preview_schedule_changes: Calendar,
  refine_schedule: RefreshCw,
};

const toolLabelMap: Record<string, string> = {
  get_unscheduled_jobs: 'Finding unscheduled jobs',
  check_team_availability: 'Checking team availability',
  get_schedule_summary: 'Getting schedule summary',
  auto_schedule_job: 'Auto-scheduling job',
  create_job_from_request: 'Creating job from request',
  optimize_route_for_date: 'Optimizing route',
  get_scheduling_conflicts: 'Finding conflicts',
  get_customer_details: 'Getting customer details',
  update_job_status: 'Updating job status',
  get_capacity_forecast: 'Forecasting capacity',
  reschedule_job: 'Rescheduling job',
  batch_schedule_jobs: 'Scheduling multiple jobs with AI',
  preview_schedule_changes: 'Previewing schedule changes',
  refine_schedule: 'Refining schedule based on feedback',
};

function getToolInfo(toolName: string) {
  return {
    icon: toolIconMap[toolName] || Clock,
    label: toolLabelMap[toolName] || toolName.replace(/_/g, ' '),
  };
}

export function ChatMessage({ message, isStreaming, onActionExecute, onApproveSchedule }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const { navigateToDate } = useCalendarNavigation();
  const [parsedContent] = useState(() => parseMessageContent(message.content));

  return (
    <div className={cn('flex gap-3 mb-4', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary/10' : 'bg-primary/10'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-primary" />
        )}
      </div>

      {/* Message Content */}
      <div className={cn('flex-1 min-w-0', isUser && 'flex justify-end')}>
        <div className={cn(
          'inline-block max-w-[85%] rounded-2xl px-4 py-2',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        )}>
          <div className="space-y-3">
            {parsedContent.map((part, idx) => {
              if (part.type === 'text') {
                return (
                  <div key={idx} className="text-sm whitespace-pre-wrap break-words">
                    {part.content}
                    {isStreaming && idx === parsedContent.length - 1 && (
                      <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
                    )}
                  </div>
                );
              }
              
              if (part.type === 'schedule_preview' && onApproveSchedule) {
                return (
                  <SchedulePreviewCard
                    key={idx}
                    scheduledJobs={part.content.scheduledJobs}
                    totalJobsRequested={part.content.totalJobsRequested}
                    estimatedTimeSaved={part.content.estimatedTimeSaved}
                    onApprove={() => onApproveSchedule(part.content)}
                    onReject={() => onActionExecute?.('I want to refine this schedule')}
                    onViewCalendar={navigateToDate}
                  />
                );
              }
              
              return null;
            })}
          </div>

          {/* Action Buttons */}
          {message.actions && message.actions.length > 0 && onActionExecute && (
            <div className="mt-3 flex flex-wrap gap-2">
              {message.actions.map((action, idx) => (
                <ActionButton
                  key={idx}
                  action={action.action}
                  label={action.label}
                  onExecute={onActionExecute}
                />
              ))}
            </div>
          )}

          {/* Tool Execution Indicators */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 space-y-2">
              {message.toolCalls.map((toolCall, idx) => {
                const toolInfo = getToolInfo(toolCall.tool);
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all",
                      toolCall.status === 'executing'
                        ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                        : "bg-green-500/10 text-green-700 dark:text-green-300"
                    )}
                  >
                    {toolCall.status === 'executing' ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <toolInfo.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-medium">{toolInfo.label}</span>
                    {toolCall.status === 'complete' && (
                      <span className="ml-auto text-[10px] opacity-60">✓</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Timestamp */}
          <div className={cn(
            'text-xs mt-1 opacity-60',
            isUser ? 'text-right' : 'text-left'
          )}>
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Parse message content to extract special syntax
function parseMessageContent(content: string): Array<{ type: 'text' | 'schedule_preview'; content: any }> {
  const parts: Array<{ type: 'text' | 'schedule_preview'; content: any }> = [];
  
  // Match [SCHEDULE_PREVIEW:...] syntax
  const schedulePreviewRegex = /\[SCHEDULE_PREVIEW:(.*?)\]/gs;
  
  let lastIndex = 0;
  let match;
  
  while ((match = schedulePreviewRegex.exec(content)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index).trim();
      if (textBefore) {
        parts.push({ type: 'text', content: textBefore });
      }
    }
    
    // Try to parse the JSON data
    try {
      const jsonStr = match[1];
      const scheduleData = JSON.parse(jsonStr);
      parts.push({ type: 'schedule_preview', content: scheduleData });
    } catch (e) {
      console.error('Failed to parse schedule preview data:', e);
      // If parsing fails, treat it as text
      parts.push({ type: 'text', content: match[0] });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex).trim();
    if (textAfter) {
      parts.push({ type: 'text', content: textAfter });
    }
  }
  
  // If no special syntax found, return the original content as text
  if (parts.length === 0) {
    parts.push({ type: 'text', content });
  }
  
  return parts;
}
