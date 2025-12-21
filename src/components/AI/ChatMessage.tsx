import { useState } from 'react';
import { Message } from '@/hooks/useAIChat';
import { Bot, User, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ActionButton } from './ActionButton';
import { SchedulePreviewCard } from './SchedulePreviewCard';
import { ClarificationCard } from './ClarificationCard';
import { ConfirmationCard } from './ConfirmationCard';
import { PlanPreviewCard } from './PlanPreviewCard';
import { PlanProgressCard } from './PlanProgressCard';
import { EntityCard, parseEntityReferences } from './EntityCard';
import { UndoButton, isReversibleAction, getUndoDescription } from './UndoButton';
import { getToolInfo } from '@/lib/ai-agent/tool-metadata';
import { useCalendarNavigation } from '@/hooks/useCalendarNavigation';
import { useConversationMedia } from '@/hooks/useConversationMedia';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onActionExecute?: (action: string) => Promise<void>;
  onApproveSchedule?: (scheduleData: any) => Promise<void>;
  onApprovePlan?: (message: string) => void;
  onRejectPlan?: (message: string) => void;
}

export function ChatMessage({ message, isStreaming, onActionExecute, onApproveSchedule, onApprovePlan, onRejectPlan }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const isSystemMessage = message.role === 'system';
  const { navigateToDate } = useCalendarNavigation();
  const [parsedContent] = useState(() => parseMessageContent(message.content));
  
  // Fetch media using authenticated hook
  const { data: mediaItems } = useConversationMedia(message.mediaIds);

  // Hide system messages that only contain tool calls (empty bubbles)
  if (isSystemMessage && message.toolCalls && message.toolCalls.length > 0) {
    return null;
  }
  
  // Hide empty assistant messages (no content and no special message type)
  if (!isUser && 
      !message.content?.trim() && 
      !message.toolCalls?.length &&
      message.messageType !== 'clarification' &&
      message.messageType !== 'confirmation' &&
      message.messageType !== 'plan_preview' &&
      message.messageType !== 'plan_progress') {
    return null;
  }

  return (
    <div className={cn(
      'flex gap-3 mb-4 animate-fade-in', 
      isUser && 'flex-row-reverse',
      isSystemMessage && 'justify-center'
    )}>
      {/* Avatar (skip for system messages) */}
      {!isSystemMessage && (
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
      )}

      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0', 
        isUser && 'flex justify-end',
        isSystemMessage && 'flex justify-center'
      )}>
        <div className={cn(
          'inline-block max-w-[85%] rounded-2xl px-4 py-2',
          isUser 
            ? 'bg-primary text-primary-foreground' 
            : 'bg-muted'
        )}>
          <div className="space-y-3">
            {/* Display attached media (photos and videos) for user messages */}
            {isUser && mediaItems && mediaItems.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {mediaItems.map((media) => (
                  media.file_type === 'photo' ? (
                    <img
                      key={media.id}
                      src={media.public_url}
                      alt={media.original_filename}
                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border border-border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(media.public_url, '_blank')}
                      loading="lazy"
                    />
                  ) : media.file_type === 'video' ? (
                    <video
                      key={media.id}
                      src={media.public_url}
                      controls
                      className="w-40 h-24 md:w-48 md:h-32 rounded-lg border border-border"
                      preload="metadata"
                    />
                  ) : null
                ))}
              </div>
            )}

            {/* Clarification Card */}
            {message.messageType === 'clarification' && message.clarification && onActionExecute && (
              <ClarificationCard
                question={message.clarification.question}
                options={message.clarification.options}
                allowFreeform={message.clarification.allowFreeform}
                onSelectOption={(value) => onActionExecute(value)}
              />
            )}

            {/* Confirmation Card */}
            {message.messageType === 'confirmation' && message.confirmation && onActionExecute && (
              <ConfirmationCard
                action={message.confirmation.action}
                description={message.confirmation.description}
                riskLevel={message.confirmation.riskLevel}
                confirmLabel={message.confirmation.confirmLabel}
                cancelLabel={message.confirmation.cancelLabel}
                onConfirm={() => onActionExecute('Yes, proceed with this action')}
                onCancel={() => onActionExecute('No, cancel this action')}
              />
            )}

            {/* Plan Preview Card */}
            {message.messageType === 'plan_preview' && message.planPreview && onApprovePlan && onRejectPlan && (
              <PlanPreviewCard
                plan={message.planPreview}
                onApprove={onApprovePlan}
                onReject={onRejectPlan}
              />
            )}

            {/* Plan Progress Card */}
            {message.messageType === 'plan_progress' && message.planProgress && (
              <PlanProgressCard progress={message.planProgress} />
            )}

            {/* Standard message content */}
            {message.messageType !== 'clarification' && 
             message.messageType !== 'confirmation' && 
             message.messageType !== 'plan_preview' && 
             message.messageType !== 'plan_progress' && 
             parsedContent.map((part, idx) => {
              if (part.type === 'text') {
                // Parse entity references within text
                const entityParts = parseEntityReferences(part.content);
                const hasEntities = entityParts.some(ep => ep.type === 'entity');
                
                return (
                  <div key={idx} className="text-sm break-words">
                    {hasEntities ? (
                      // Render with inline entity cards
                      entityParts.map((ep, epIdx) => 
                        ep.type === 'entity' ? (
                          <EntityCard
                            key={epIdx}
                            entityType={ep.content.entityType}
                            entityId={ep.content.entityId}
                            displayName={ep.content.displayName}
                          />
                        ) : (
                          <span key={epIdx} className="inline prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-p:inline prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => <span>{children}</span>,
                              }}
                            >
                              {ep.content}
                            </ReactMarkdown>
                          </span>
                        )
                      )
                    ) : (
                      // Render full markdown
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
                        <ReactMarkdown>
                          {part.content}
                        </ReactMarkdown>
                      </div>
                    )}
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
              
              // Render inline clarification options as clickable buttons
              if (part.type === 'clarify' && onActionExecute) {
                return (
                  <div key={idx} className="space-y-3">
                    {part.content.introText && (
                      <p className="text-sm">{part.content.introText}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {part.content.options.map((option: string, optIdx: number) => (
                        <button
                          key={optIdx}
                          onClick={() => onActionExecute(option.replace(/^[📅👥🗓️🔄➕📋✅🔍📝📊📧💰💳📜⏱️]\s*/g, ''))}
                          className="px-3 py-1.5 text-xs rounded-full bg-primary/10 hover:bg-primary/20 text-primary transition-colors border border-primary/20"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
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
                  variant={action.variant}
                  onExecute={onActionExecute}
                />
              ))}
            </div>
          )}

          {/* Tool Execution Indicators - Compact inline badges */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {message.toolCalls.map((toolCall, idx) => {
                const toolInfo = getToolInfo(toolCall.tool);
                return (
                  <span
                    key={idx}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium",
                      toolCall.status === 'error'
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {toolCall.status === 'error' ? (
                      <XCircle className="w-3 h-3" />
                    ) : (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    {toolInfo.label}
                    {toolCall.status === 'complete' && isReversibleAction(toolCall.tool) && onActionExecute && (
                      <UndoButton
                        actionId={toolCall.tool}
                        actionDescription={getUndoDescription(toolCall.tool, toolCall.result)}
                        onUndo={(msg) => onActionExecute(msg)}
                        className="ml-1"
                      />
                    )}
                  </span>
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
function parseMessageContent(content: string): Array<{ type: 'text' | 'schedule_preview' | 'clarify'; content: any }> {
  const parts: Array<{ type: 'text' | 'schedule_preview' | 'clarify'; content: any }> = [];
  
  // Match [CLARIFY]...[/CLARIFY] syntax first
  const clarifyRegex = /\[CLARIFY\]([\s\S]*?)\[\/CLARIFY\]/gs;
  // Match [SCHEDULE_PREVIEW:...] syntax
  const schedulePreviewRegex = /\[SCHEDULE_PREVIEW:(.*?)\]/gs;
  
  let lastIndex = 0;
  let match;
  
  // First handle CLARIFY blocks
  const contentWithoutClarify = content.replace(clarifyRegex, (fullMatch, clarifyContent) => {
    // Parse clarify content to extract options
    const lines = clarifyContent.trim().split('\n');
    const options: string[] = [];
    let introText = '';
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
        options.push(trimmedLine.replace(/^[•\-]\s*/, '').trim());
      } else if (trimmedLine && !options.length) {
        introText = trimmedLine;
      }
    }
    
    parts.push({ 
      type: 'clarify', 
      content: { introText, options } 
    });
    
    return ''; // Remove from content
  });
  
  // Then handle SCHEDULE_PREVIEW in remaining content
  lastIndex = 0;
  while ((match = schedulePreviewRegex.exec(contentWithoutClarify)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      const textBefore = contentWithoutClarify.slice(lastIndex, match.index).trim();
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
  if (lastIndex < contentWithoutClarify.length) {
    const textAfter = contentWithoutClarify.slice(lastIndex).trim();
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
