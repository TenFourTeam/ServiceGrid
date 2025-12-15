import { useState, useCallback, useRef } from 'react';
import { useBusinessContext } from './useBusinessContext';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useConversationMediaUpload } from './useConversationMediaUpload';

export interface ClarificationData {
  question: string;
  options?: Array<{ label: string; value: string }>;
  intent?: string;
  allowFreeform?: boolean;
}

export interface ConfirmationData {
  action: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface PlanStepData {
  id: string;
  name: string;
  description: string;
  tool: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rolled_back' | 'skipped';
  result?: any;
  error?: string;
}

export interface PlanPreviewData {
  id: string;
  name: string;
  description: string;
  steps: PlanStepData[];
  requiresApproval: boolean;
}

export interface PlanProgressData {
  planId: string;
  planName: string;
  steps: PlanStepData[];
  currentStepIndex: number;
  status: 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled';
  summary?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    rolledBackSteps: number;
    durationMs?: number;
  };
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  mediaIds?: string[];
  toolCalls?: Array<{
    tool: string;
    status: 'executing' | 'complete' | 'error';
    result?: any;
  }>;
  actions?: Array<{
    action: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  // Special message types for agent flows
  messageType?: 'standard' | 'clarification' | 'confirmation' | 'plan_preview' | 'plan_progress';
  clarification?: ClarificationData;
  confirmation?: ConfirmationData;
  planPreview?: PlanPreviewData;
  planProgress?: PlanProgressData;
}

interface UseAIChatOptions {
  conversationId?: string;
  onNewConversation?: (id: string) => void;
}

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(options?.conversationId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const { uploadMedia } = useConversationMediaUpload();

  const sendMessage = useCallback(async (content: string, attachments?: File[], context?: any) => {
    if (!businessId || (!content.trim() && (!attachments || attachments.length === 0))) return;

    // Upload attachments first if any (without linking to conversation)
    let mediaIds: string[] = [];
    if (attachments && attachments.length > 0) {
      // Validate files before uploading
      const invalidFiles = attachments.filter(file => {
        const isValidType = file.type.startsWith('image/') || file.type.startsWith('video/');
        const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB
        return !isValidType || !isValidSize;
      });

      if (invalidFiles.length > 0) {
        const tooLarge = invalidFiles.filter(f => f.size > 100 * 1024 * 1024);
        const invalidType = invalidFiles.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
        
        if (tooLarge.length > 0) {
          toast.error(`${tooLarge.length} file(s) exceed 100MB limit`);
        }
        if (invalidType.length > 0) {
          toast.error('Only images and videos are supported');
        }
        return;
      }

      try {
        const uploadPromises = attachments.map(async (file) => {
          const result = await uploadMedia(file, {
            conversationId: null, // Don't link to conversation - ai-chat will handle it
            onProgress: (progress) => {
              console.log(`Upload progress: ${progress}%`);
            }
          });
          return result.mediaId;
        });

        mediaIds = await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Error uploading attachments:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload images';
        toast.error(errorMessage);
        return;
      }
    }

    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
      mediaIds,
    };
    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);
    setCurrentStreamingMessage('');

    try {
      const token = await getToken({ template: 'supabase' });
      abortControllerRef.current = new AbortController();

      const response = await fetch(
        'https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/ai-chat',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId,
            message: content,
            mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
            includeContext: {
              currentPage: window.location.pathname,
              ...context
            }
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      // Handle rate limit and payment errors
      if (!response.ok) {
        if (response.status === 429) {
          toast.error('AI is experiencing high demand. Please try again in a moment.');
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          abortControllerRef.current = null;
          return;
        }
        
        if (response.status === 402) {
          toast.error('AI credits exhausted. Please add credits to continue.', {
            action: {
              label: 'Add Credits',
              onClick: () => window.open('https://lovable.dev/settings/usage', '_blank')
            },
            duration: 10000
          });
          setIsStreaming(false);
          setCurrentStreamingMessage('');
          abortControllerRef.current = null;
          return;
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageId = crypto.randomUUID();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'conversation_id') {
                setConversationId(data.id);
                options?.onNewConversation?.(data.id);
              } else if (data.type === 'greeting') {
                // Show greeting as first assistant message
                const greetingMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: data.content,
                  timestamp: new Date(),
                };
                setMessages([greetingMessage]);
                setIsStreaming(false); // Stop streaming indicator after greeting
              } else if (data.type === 'token') {
                fullContent += data.content;
                setCurrentStreamingMessage(fullContent);
                setCurrentToolName(null); // Clear tool name when streaming starts
              } else if (data.type === 'tool_call') {
                // Create a system message for tool execution
                const toolSystemMessage: Message = {
                  id: `tool-${data.tool}-${Date.now()}`,
                  role: 'system',
                  content: `Executing: ${data.tool}`,
                  timestamp: new Date(),
                  toolCalls: [{ tool: data.tool, status: 'executing' as const }]
                };
                
                setCurrentToolName(data.tool);
                setMessages(prev => [...prev, toolSystemMessage]);
                
                // Show toast for important actions
                const importantTools = ['batch_schedule_jobs', 'auto_schedule_job', 'optimize_route_for_date'];
                const toolLabels: Record<string, string> = {
                  batch_schedule_jobs: 'Scheduling multiple jobs with AI',
                  auto_schedule_job: 'Auto-scheduling job',
                  optimize_route_for_date: 'Optimizing route',
                  check_team_availability: 'Checking team availability',
                  get_unscheduled_jobs: 'Finding unscheduled jobs',
                };
                
                if (importantTools.includes(data.tool)) {
                  toast.info(toolLabels[data.tool] || data.tool.replace(/_/g, ' '), {
                    icon: '🔧',
                    duration: 2000,
                  });
                }
              } else if (data.type === 'tool_result') {
                // Update tool system message to mark complete
                setMessages(prev => {
                  const toolMsgIndex = prev.findIndex(m => 
                    m.role === 'system' && 
                    m.toolCalls?.some(tc => tc.tool === data.tool && tc.status === 'executing')
                  );
                  
                  if (toolMsgIndex !== -1) {
                    const updated = [...prev];
                    updated[toolMsgIndex] = {
                      ...updated[toolMsgIndex],
                      toolCalls: [{ tool: data.tool, status: 'complete' as const, result: data.result }]
                    };
                    return updated;
                  }
                  return prev;
                });
                
                // Show success toast
                if (data.success !== false) {
                  toast.success('Action completed', { icon: '✅', duration: 1500 });
                }
              } else if (data.type === 'tool_error') {
                // Update tool system message to mark error
                setMessages(prev => {
                  const toolMsgIndex = prev.findIndex(m => 
                    m.role === 'system' && 
                    m.toolCalls?.some(tc => tc.tool === data.tool && tc.status === 'executing')
                  );
                  
                  if (toolMsgIndex !== -1) {
                    const updated = [...prev];
                    updated[toolMsgIndex] = {
                      ...updated[toolMsgIndex],
                      toolCalls: [{ tool: data.tool, status: 'error' as const, result: data.error }]
                    };
                    return updated;
                  }
                  return prev;
                });
                
                const toolLabels: Record<string, string> = {
                  batch_schedule_jobs: 'Scheduling jobs',
                  auto_schedule_job: 'Auto-scheduling',
                  optimize_route_for_date: 'Route optimization',
                };
                
                toast.error(`Failed: ${toolLabels[data.tool] || data.tool.replace(/_/g, ' ')}`, {
                  description: data.error,
                  icon: '❌',
                });
              } else if (data.type === 'tool_progress') {
                // Update tool system message with progress
                setMessages(prev => {
                  const toolMsgIndex = prev.findIndex(m => 
                    m.role === 'system' && 
                    m.toolCalls?.some(tc => tc.status === 'executing')
                  );
                  
                  if (toolMsgIndex !== -1) {
                    const updated = [...prev];
                    updated[toolMsgIndex] = {
                      ...updated[toolMsgIndex],
                      content: data.progress
                    };
                    return updated;
                  }
                  return prev;
                });
              } else if (data.type === 'clarification') {
                // Show clarification message with options
                const clarificationMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: data.question,
                  timestamp: new Date(),
                  messageType: 'clarification',
                  clarification: {
                    question: data.question,
                    options: data.options || [],
                    intent: data.intent,
                    allowFreeform: data.allowFreeform ?? true,
                  },
                };
                setMessages(prev => [...prev, clarificationMessage]);
                setCurrentStreamingMessage('');
                setIsStreaming(false);
              } else if (data.type === 'confirmation') {
                // Show confirmation message with approve/reject buttons
                const confirmationMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: data.description,
                  timestamp: new Date(),
                  messageType: 'confirmation',
                  confirmation: {
                    action: data.action,
                    description: data.description,
                    riskLevel: data.riskLevel || 'medium',
                    confirmLabel: data.confirmLabel,
                    cancelLabel: data.cancelLabel,
                  },
                };
                setMessages(prev => [...prev, confirmationMessage]);
                setCurrentStreamingMessage('');
                setIsStreaming(false);
              } else if (data.type === 'plan_preview') {
                // Show multi-step plan preview for approval
                const planPreviewMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `I've prepared a multi-step plan: "${data.plan.name}"`,
                  timestamp: new Date(),
                  messageType: 'plan_preview',
                  planPreview: {
                    id: data.plan.id,
                    name: data.plan.name,
                    description: data.plan.description,
                    steps: data.plan.steps,
                    requiresApproval: data.plan.requiresApproval,
                  },
                };
                setMessages(prev => [...prev, planPreviewMessage]);
                setCurrentStreamingMessage('');
                // Keep streaming true so we can receive plan execution updates
              } else if (data.type === 'step_progress') {
                // Update plan progress in existing message
                setMessages(prev => {
                  const planMsgIndex = prev.findIndex(m => 
                    m.messageType === 'plan_preview' && 
                    m.planPreview?.id === data.planId
                  );
                  
                  if (planMsgIndex !== -1) {
                    const updated = [...prev];
                    const existingMsg = updated[planMsgIndex];
                    
                    // Convert to progress view
                    updated[planMsgIndex] = {
                      ...existingMsg,
                      messageType: 'plan_progress',
                      planProgress: {
                        planId: data.planId,
                        planName: existingMsg.planPreview?.name || 'Plan',
                        steps: data.step ? 
                          existingMsg.planPreview?.steps.map((s, i) => 
                            i === data.stepIndex ? { ...s, status: data.step.status, error: data.step.error } : s
                          ) || [] : 
                          existingMsg.planPreview?.steps || [],
                        currentStepIndex: data.stepIndex,
                        status: 'executing',
                      },
                    };
                    return updated;
                  }
                  return prev;
                });
              } else if (data.type === 'plan_complete') {
                // Update plan to completed state
                setMessages(prev => {
                  const planMsgIndex = prev.findIndex(m => 
                    (m.messageType === 'plan_progress' || m.messageType === 'plan_preview') && 
                    (m.planProgress?.planId === data.planId || m.planPreview?.id === data.planId)
                  );
                  
                  if (planMsgIndex !== -1) {
                    const updated = [...prev];
                    const existingMsg = updated[planMsgIndex];
                    
                    updated[planMsgIndex] = {
                      ...existingMsg,
                      messageType: 'plan_progress',
                      planProgress: {
                        planId: data.planId,
                        planName: existingMsg.planProgress?.planName || existingMsg.planPreview?.name || 'Plan',
                        steps: existingMsg.planProgress?.steps || existingMsg.planPreview?.steps || [],
                        currentStepIndex: data.summary?.totalSteps - 1 || 0,
                        status: data.status || 'completed',
                        summary: data.summary,
                      },
                    };
                    return updated;
                  }
                  return prev;
                });
                setIsStreaming(false);
                
                // Show success toast
                if (data.status === 'completed') {
                  toast.success(`Plan completed: ${data.summary?.successfulSteps}/${data.summary?.totalSteps} steps succeeded`);
                } else if (data.status === 'failed') {
                  toast.error('Plan failed - some steps were rolled back');
                }
              } else if (data.type === 'done') {
                // Finalize message with parsed actions
                const { cleanContent, actions } = parseMessageActions(fullContent);
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.id === assistantMessageId) {
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, content: cleanContent, actions }
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: 'assistant' as const,
                      content: cleanContent,
                      timestamp: new Date(),
                      actions,
                    }
                  ];
                });
                setCurrentStreamingMessage('');
                setCurrentToolName(null);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error sending message:', error);
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error.message}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      abortControllerRef.current = null;
    }
  }, [businessId, conversationId, getToken, options]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentStreamingMessage('');
    setConversationId(undefined);
  }, []);

  const loadConversation = useCallback(async (convId: string) => {
    if (!businessId) return;
    
    try {
      const token = await getToken({ template: 'supabase' });
      const response = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/ai-chat-messages?conversationId=${convId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (!response.ok) throw new Error('Failed to load conversation');
      
      const { messages: loadedMessages } = await response.json();
      
      // Transform backend messages to frontend Message format
      const transformedMessages: Message[] = loadedMessages.map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        mediaIds: msg.metadata?.mediaIds || [],
        toolCalls: msg.tool_calls || [],
        actions: parseMessageActions(msg.content).actions
      }));
      
      setMessages(transformedMessages);
      setConversationId(convId);
      toast.success('Conversation loaded');
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation');
    }
  }, [businessId, getToken]);

  return {
    messages,
    isStreaming,
    currentStreamingMessage,
    currentToolName,
    conversationId,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
  };
}

// Helper function to parse action buttons from message content
function parseMessageActions(content: string): { 
  cleanContent: string; 
  actions: Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }> 
} {
  const actions: Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }> = [];
  
  // Extract [BUTTON:action:label|variant] syntax
  // Supports complex actions with colons (like JSON) by using non-greedy matching
  const buttonRegex = /\[BUTTON:(.*?):([^:|\]]+?)(?:\|(\w+))?\]/g;
  const cleanContent = content.replace(buttonRegex, (match, action, label, variant) => {
    actions.push({ 
      action: action.trim(), 
      label: label.trim(),
      variant: (variant as 'primary' | 'secondary' | 'danger') || undefined
    });
    return ''; // Remove button syntax from content
  }).trim();
  
  return { cleanContent, actions };
}
