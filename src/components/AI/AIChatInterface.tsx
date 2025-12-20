import { useEffect, useRef } from 'react';
import { useAIChat } from '@/hooks/useAIChat';
import { useAIConversations } from '@/hooks/useAIConversations';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { TypingIndicator } from './TypingIndicator';
import { ConversationStarters } from './ConversationStarters';
import { Sparkles, Trash2, MessageSquare, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface AIChatInterfaceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMessage?: string;
  context?: any;
}

export function AIChatInterface({
  open,
  onOpenChange,
  initialMessage,
  context
}: AIChatInterfaceProps) {
  const {
    messages,
    isStreaming,
    currentStreamingMessage,
    currentToolName,
    conversationId,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
  } = useAIChat({
    onNewConversation: (id) => {
      console.log('New conversation created:', id);
    }
  });

  const { conversations, deleteConversation } = useAIConversations();
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoSentRef = useRef(false);
  const isMobile = useIsMobile();

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentStreamingMessage]);

  // Auto-send initial message
  useEffect(() => {
    if (open && initialMessage && !hasAutoSentRef.current && messages.length === 0) {
      hasAutoSentRef.current = true;
      sendMessage(initialMessage, context);
    }
  }, [open, initialMessage, context, sendMessage, messages.length]);

  // Reset auto-send flag when dialog closes
  useEffect(() => {
    if (!open) {
      hasAutoSentRef.current = false;
    }
  }, [open]);

  const suggestions = messages.length === 0 ? [
    'Schedule all pending jobs',
    'Who\'s available tomorrow?',
    'Show me this week\'s schedule',
  ] : [];

  const conversationsData = Array.isArray(conversations) ? { today: [], yesterday: [], lastWeek: [], older: [] } : conversations;
  
  const allConversations = [
    ...conversationsData.today,
    ...conversationsData.yesterday,
    ...conversationsData.lastWeek,
    ...conversationsData.older,
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              AI Assistant
            </SheetTitle>
            
            <div className="flex items-center gap-2">
              {/* Active Task Indicator (PHASE 2) */}
              {currentToolName && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {currentToolName.replace(/_/g, ' ')}
                </div>
              )}
              
              {messages.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clearMessages();
                    toast.success('Started new conversation');
                  }}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  New Chat
                </Button>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 min-h-0">
          {/* Conversation History Sidebar */}
          {allConversations.length > 0 && (
            <div className="w-48 border-r border-border flex-shrink-0 hidden md:block">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {conversationsData.today.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Today</h3>
                      {conversationsData.today.map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conversationId === conv.id}
                          onSelect={() => {
                            if (conversationId === conv.id) return;
                            if (isStreaming) {
                              toast.error('Cannot switch conversations while streaming');
                              return;
                            }
                            loadConversation(conv.id);
                          }}
                          onDelete={() => deleteConversation(conv.id)}
                          disabled={isStreaming}
                        />
                      ))}
                    </div>
                  )}
                  {conversationsData.yesterday.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Yesterday</h3>
                      {conversationsData.yesterday.map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conversationId === conv.id}
                          onSelect={() => {
                            if (conversationId === conv.id) return;
                            if (isStreaming) {
                              toast.error('Cannot switch conversations while streaming');
                              return;
                            }
                            loadConversation(conv.id);
                          }}
                          onDelete={() => deleteConversation(conv.id)}
                          disabled={isStreaming}
                        />
                      ))}
                    </div>
                  )}
                  {conversationsData.lastWeek.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Last 7 Days</h3>
                      {conversationsData.lastWeek.map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conversationId === conv.id}
                          onSelect={() => {
                            if (conversationId === conv.id) return;
                            if (isStreaming) {
                              toast.error('Cannot switch conversations while streaming');
                              return;
                            }
                            loadConversation(conv.id);
                          }}
                          onDelete={() => deleteConversation(conv.id)}
                          disabled={isStreaming}
                        />
                      ))}
                    </div>
                  )}
                  {conversationsData.older.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-muted-foreground mb-2">Older</h3>
                      {conversationsData.older.map(conv => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conversationId === conv.id}
                          onSelect={() => {
                            if (conversationId === conv.id) return;
                            if (isStreaming) {
                              toast.error('Cannot switch conversations while streaming');
                              return;
                            }
                            loadConversation(conv.id);
                          }}
                          onDelete={() => deleteConversation(conv.id)}
                          disabled={isStreaming}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <ScrollArea className={cn("flex-1 py-6", isMobile ? "px-2" : "px-4")} ref={scrollRef}>
              {messages.length === 0 && !currentStreamingMessage && (
                <div className="h-full flex items-center justify-center py-8">
                  <div className="text-center max-w-2xl w-full">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className={cn("w-8 h-8 text-primary", isStreaming && "animate-pulse")} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      {isStreaming ? 'Connecting to AI...' : 'AI Assistant Ready'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-8">
                      {isStreaming ? 'Preparing personalized assistant' : 'I can help you schedule jobs, check availability, and optimize your routes.'}
                    </p>
                    {!isStreaming && (
                      <ConversationStarters
                        currentPage={context?.currentPage}
                        onStarterClick={(msg) => sendMessage(msg, context)}
                      />
                    )}
                  </div>
                </div>
              )}

              {messages.map(msg => (
                <ChatMessage 
                  key={msg.id} 
                  message={msg}
                  onActionExecute={async (action) => {
                    // Execute action by sending it as a message
                    await sendMessage(action, undefined, context);
                  }}
                  onApproveSchedule={async (scheduleData) => {
                    // Send approval confirmation to AI
                    await sendMessage('Yes, approve this schedule', undefined, context);
                  }}
                  onApprovePlan={(approvalMessage) => {
                    // Send plan approval message (e.g., "plan_approve:uuid")
                    sendMessage(approvalMessage, undefined, context);
                  }}
                  onRejectPlan={(rejectionMessage) => {
                    // Send plan rejection message (e.g., "plan_reject:uuid")
                    sendMessage(rejectionMessage, undefined, context);
                  }}
                />
              ))}

              {/* Show typing indicator when streaming but no content yet */}
              {isStreaming && !currentStreamingMessage && (
                <TypingIndicator toolName={currentToolName} />
              )}

              {currentStreamingMessage && (
                <ChatMessage
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: currentStreamingMessage,
                    timestamp: new Date(),
                  }}
                  isStreaming
                />
              )}
            </ScrollArea>

            {/* Input */}
            <ChatInput
              onSend={(msg, attachments) => sendMessage(msg, attachments, context)}
              onStop={stopStreaming}
              isStreaming={isStreaming}
              suggestions={suggestions}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ConversationItem({ 
  conversation, 
  onDelete,
  isActive,
  onSelect,
  disabled
}: { 
  conversation: any; 
  onDelete: () => void;
  isActive: boolean;
  onSelect: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="group relative mb-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full justify-start text-left text-xs h-auto py-2 px-2 transition-colors",
          isActive && "bg-primary/10 border-l-2 border-primary"
        )}
        onClick={onSelect}
        disabled={disabled}
      >
        <MessageSquare className="w-3 h-3 mr-2 flex-shrink-0" />
        <span className="truncate">{conversation.title || 'New conversation'}</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 h-6 w-6"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}
