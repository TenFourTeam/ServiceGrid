import { Message } from '@/hooks/useAIChat';
import { Bot, User, Loader2, CheckCircle2, Calendar, Users, MapPin, Clock, FileText, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
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
};

function getToolInfo(toolName: string) {
  return {
    icon: toolIconMap[toolName] || Clock,
    label: toolLabelMap[toolName] || toolName.replace(/_/g, ' '),
  };
}

export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 mb-4', isUser && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
        isUser ? 'bg-primary/10' : 'bg-gradient-to-br from-purple-500/20 to-pink-500/20'
      )}>
        {isUser ? (
          <User className="w-4 h-4 text-primary" />
        ) : (
          <Bot className="w-4 h-4 text-purple-600" />
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
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
            )}
          </div>

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
