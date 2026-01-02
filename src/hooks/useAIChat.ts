import { useState, useCallback, useRef } from 'react';
import { useBusinessContext } from './useBusinessContext';
import { useAuth } from '@/hooks/useAuth';
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

export interface RecoveryActionData {
  id: string;
  label: string;
  description: string;
  navigateTo?: string;
  isConversational?: boolean;
}

export interface EntitySelectionOption {
  id: string;
  label: string;
  value: string;
  metadata?: any;
}

export interface EntitySelectionData {
  question: string;
  resolvesEntity: string;
  options: EntitySelectionOption[];
}

export interface PlanProgressData {
  planId: string;
  planName: string;
  steps: PlanStepData[];
  currentStepIndex: number;
  status: 'executing' | 'completed' | 'failed' | 'rolled_back' | 'cancelled' | 'awaiting_recovery';
  startedAt?: string;
  pausedAtStep?: number;
  recoveryActions?: RecoveryActionData[];
  canResume?: boolean;
  entitySelection?: EntitySelectionData;
  summary?: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    rolledBackSteps: number;
    durationMs?: number;
  };
}

export interface ToolResultData {
  tool: string;
  result: any;
  success: boolean;
  displayData?: {
    summary: string;
    entityType?: string;
    entityId?: string;
    entityName?: string;
    actions?: Array<{ label: string; action: string }>;
    items?: Array<{
      name: string;
      status: 'success' | 'failed' | 'skipped';
      message?: string;
    }>;
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
    reversible?: boolean;
  }>;
  // Tool results with rich display data
  toolResults?: ToolResultData[];
  actions?: Array<{
    action: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'danger';
  }>;
  // Special message types for agent flows
  messageType?: 'standard' | 'clarification' | 'confirmation' | 'plan_preview' | 'plan_progress' | 'lead_workflow';
  clarification?: ClarificationData;
  confirmation?: ConfirmationData;
  planPreview?: PlanPreviewData;
  planProgress?: PlanProgressData;
  // Lead workflow card data
  leadWorkflow?: {
    steps: Array<{
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
    }>;
    currentStepIndex: number;
    customerData?: {
      name?: string;
      email?: string;
      phone?: string;
      leadScore?: number;
      leadSource?: string;
    };
    automationSummary?: {
      leadScored?: boolean;
      leadScore?: number;
      autoAssigned?: boolean;
      assignedTo?: string;
      emailQueued?: boolean;
      emailDelay?: number;
    };
  };
  // Entity selection - rendered as a conversational element outside plan card
  entitySelection?: {
    planId: string;
    question: string;
    resolvesEntity: string;
    options: EntitySelectionOption[];
  };
}

// Navigation event handler type
type NavigationHandler = (url: string, entityName?: string) => void;

interface UseAIChatOptions {
  conversationId?: string;
  onNewConversation?: (id: string) => void;
  onNavigate?: NavigationHandler;
}

export function useAIChat(options?: UseAIChatOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [currentToolName, setCurrentToolName] = useState<string | null>(null);
  const [toolProgress, setToolProgress] = useState<{ current: number; total: number } | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(options?.conversationId);
  const [lastFailedMessage, setLastFailedMessage] = useState<{ content: string; attachments?: File[]; context?: any } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const { uploadMedia } = useConversationMediaUpload();

  // Reversible tools for undo functionality
  const reversibleTools = new Set([
    'update_job_status', 'update_job', 'update_customer', 'update_quote',
    'reschedule_job', 'auto_schedule_job', 'batch_schedule_jobs',
    'assign_team_member', 'clock_in', 'clock_out', 'approve_quote', 'approve_time_off'
  ]);

  const sendMessage = useCallback(async (content: string, attachments?: File[], context?: any) => {
    if (!businessId || (!content.trim() && (!attachments || attachments.length === 0))) return;

    // Clear any previous failed message state on new attempt
    setLastFailedMessage(null);

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
      const token = await getToken();
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
      let pendingToolResults: ToolResultData[] = [];

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
                // Only set greeting if no messages exist, otherwise prepend it
                setMessages(prev => {
                  if (prev.length === 0) {
                    return [greetingMessage];
                  }
                  // If user already sent a message, prepend greeting before their message
                  const hasGreeting = prev.some(m => m.role === 'assistant' && m.content === data.content);
                  if (hasGreeting) return prev; // Don't duplicate greeting
                  return [greetingMessage, ...prev];
                });
                setIsStreaming(false); // Stop streaming indicator after greeting
              } else if (data.type === 'token') {
                fullContent += data.content;
                setCurrentStreamingMessage(fullContent);
                setCurrentToolName(null); // Clear tool name when streaming starts
              } else if (data.type === 'tool_call') {
                // Just update the tool indicator - don't create system messages
                setCurrentToolName(data.tool);
              } else if (data.type === 'tool_result') {
                // Clear tool indicator and progress
                setCurrentToolName(null);
                setToolProgress(null);
                
                // Store tool result for display in the final message
                const toolResult: ToolResultData = {
                  tool: data.tool,
                  result: data.result,
                  success: data.success !== false,
                  displayData: data.result?._display
                };
                
                // Add to pending tool results for this message
                pendingToolResults.push(toolResult);
                
                // Handle navigation tool results
                if (data.tool === 'navigate_to_entity' && data.result?.url) {
                  options?.onNavigate?.(data.result.url, data.result.entityName);
                } else if (data.tool === 'navigate_to_calendar' && data.result?.url) {
                  options?.onNavigate?.(data.result.url, 'Calendar');
                }
                
                // Show success toast for important mutations with action buttons
                const mutationTools: Record<string, { 
                  message: string; 
                  action?: { label: string; onClick: () => void };
                }> = {
                  auto_schedule_job: {
                    message: `Scheduled "${data.result?.job_title || data.result?.job?.title || 'job'}"`,
                    action: data.result?.starts_at ? {
                      label: 'View Calendar',
                      onClick: () => options?.onNavigate?.(`/calendar?date=${data.result.starts_at.split('T')[0]}`, 'Calendar')
                    } : undefined
                  },
                  batch_schedule_jobs: {
                    message: `Scheduled ${data.result?.scheduled?.length || data.result?.success?.length || 0} jobs`
                  },
                  create_quote: {
                    message: `Quote #${data.result?.number || ''} created`
                  },
                  create_invoice: {
                    message: `Invoice #${data.result?.number || ''} created`
                  },
                  record_payment: {
                    message: `Payment of ${data.result?.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || ''} recorded`
                  }
                };
                
                const toolMutation = mutationTools[data.tool];
                if (toolMutation && data.success !== false) {
                  if (toolMutation.action) {
                    toast.success(toolMutation.message, {
                      action: {
                        label: toolMutation.action.label,
                        onClick: toolMutation.action.onClick
                      },
                      duration: 5000
                    });
                  } else {
                    toast.success(toolMutation.message, { duration: 3000 });
                  }
                }
              } else if (data.type === 'tool_error') {
                // Clear tool indicator and show error toast (errors are important)
                setCurrentToolName(null);
                
                const toolLabels: Record<string, string> = {
                  batch_schedule_jobs: 'Scheduling jobs',
                  auto_schedule_job: 'Auto-scheduling',
                  optimize_route_for_date: 'Route optimization',
                };
                
                toast.error(`Failed: ${toolLabels[data.tool] || data.tool.replace(/_/g, ' ')}`, {
                  description: data.error,
                });
              } else if (data.type === 'tool_progress') {
                // Update tool name and progress for batch operations
                setCurrentToolName(data.tool);
                if (data.progress) {
                  setToolProgress({ current: data.progress.current, total: data.progress.total });
                }
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
              } else if (data.type === 'lead_workflow') {
                // Lead workflow start - use specialized LeadWorkflowCard
                const leadWorkflowMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: 'Starting lead capture workflow...',
                  timestamp: new Date(),
                  messageType: 'lead_workflow',
                  leadWorkflow: {
                    steps: data.workflow.steps.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      description: s.description,
                      status: s.status,
                      tool: s.tool,
                    })),
                    currentStepIndex: data.workflow.currentStepIndex || 0,
                    customerData: data.workflow.customerData || {},
                  },
                  // Also store planId for approval handling
                  planPreview: {
                    id: data.planId,
                    name: 'Lead Capture',
                    description: 'Capture and process new lead',
                    steps: data.workflow.steps,
                    requiresApproval: true,
                  },
                };
                setMessages(prev => [...prev, leadWorkflowMessage]);
                setCurrentStreamingMessage('');
                // Keep streaming true for progress updates
              } else if (data.type === 'lead_workflow_progress') {
                // Update lead workflow progress with verification and automation summary
                setMessages(prev => {
                  const workflowMsgIndex = prev.findIndex(m => m.messageType === 'lead_workflow');
                  if (workflowMsgIndex !== -1) {
                    const updated = [...prev];
                    updated[workflowMsgIndex] = {
                      ...updated[workflowMsgIndex],
                      leadWorkflow: {
                        steps: data.steps.map((s: any) => ({
                          id: s.id,
                          name: s.name,
                          description: s.description,
                          status: s.status,
                          tool: s.tool,
                          result: s.result,
                          error: s.error,
                          verification: s.verification,
                          rollbackExecuted: s.rollbackExecuted,
                          rollbackTool: s.rollbackTool,
                        })),
                        currentStepIndex: data.stepIndex,
                        customerData: data.customerData || updated[workflowMsgIndex].leadWorkflow?.customerData || {},
                        automationSummary: data.automationSummary || updated[workflowMsgIndex].leadWorkflow?.automationSummary,
                      },
                    };
                    return updated;
                  }
                  return prev;
                });
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
                    (m.messageType === 'plan_preview' || m.messageType === 'plan_progress') && 
                    (m.planPreview?.id === data.planId || m.planProgress?.planId === data.planId)
                  );
                  
                  if (planMsgIndex !== -1) {
                    const updated = [...prev];
                    const existingMsg = updated[planMsgIndex];
                    const existingSteps = existingMsg.planProgress?.steps || existingMsg.planPreview?.steps || [];
                    
                    // Use full steps array from backend if available, otherwise fall back to local update
                    const updatedSteps = data.steps?.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      description: existingSteps.find(es => es.id === s.id)?.description || '',
                      tool: s.tool,
                      status: s.status,
                      error: s.error,
                    })) || existingSteps.map((s, i) => 
                      i === data.stepIndex && data.step 
                        ? { ...s, status: data.step.status, error: data.step.error } 
                        : s
                    );
                    
                    // Convert to progress view
                    updated[planMsgIndex] = {
                      ...existingMsg,
                      messageType: 'plan_progress',
                      planProgress: {
                        planId: data.planId,
                        planName: data.planName || existingMsg.planProgress?.planName || existingMsg.planPreview?.name || 'Plan',
                        steps: updatedSteps,
                        currentStepIndex: data.stepIndex,
                        status: 'executing',
                        startedAt: data.startedAt || existingMsg.planProgress?.startedAt,
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
                    const existingSteps = existingMsg.planProgress?.steps || existingMsg.planPreview?.steps || [];
                    
                    // Use steps from server for accurate final state
                    const finalSteps = data.steps?.map((s: any) => ({
                      id: s.id,
                      name: s.name,
                      description: existingSteps.find(es => es.id === s.id)?.description || '',
                      tool: s.tool,
                      status: s.status,
                      error: s.error,
                    })) || existingSteps;
                    
                    updated[planMsgIndex] = {
                      ...existingMsg,
                      messageType: 'plan_progress',
                      planProgress: {
                        planId: data.planId,
                        planName: data.planName || existingMsg.planProgress?.planName || existingMsg.planPreview?.name || 'Plan',
                        steps: finalSteps,
                        currentStepIndex: (data.summary?.totalSteps || finalSteps.length) - 1,
                        status: data.status || 'completed',
                        startedAt: data.startedAt || existingMsg.planProgress?.startedAt,
                        pausedAtStep: data.pausedAtStep,
                        summary: data.summary,
                        // Include recovery actions if available
                        recoveryActions: data.recoveryActions,
                        canResume: data.canResume,
                        // Include entity selection if available
                        entitySelection: data.entitySelection,
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
              } else if (data.type === 'entity_selection') {
                // Entity selection creates a conversational flow - first finalize any streaming content
                // then attach the entity selection to that message
                const entitySelectionData = {
                  planId: data.planId,
                  question: data.question,
                  resolvesEntity: data.resolvesEntity,
                  options: data.options,
                };
                
                // Get the current streaming content to include in the message
                const streamedText = fullContent.trim();
                
                setMessages(prev => {
                  // Check if there's a last assistant message we can attach to
                  const lastAssistantIdx = prev.findIndex((m, i) => 
                    i === prev.length - 1 && m.role === 'assistant' && !m.entitySelection
                  );
                  
                  if (lastAssistantIdx !== -1) {
                    // Attach to existing message
                    const updated = [...prev];
                    updated[lastAssistantIdx] = {
                      ...updated[lastAssistantIdx],
                      content: updated[lastAssistantIdx].content || streamedText,
                      entitySelection: entitySelectionData,
                    };
                    return updated;
                  }
                  
                  // Create new message with the streamed content and entity selection
                  return [...prev, {
                    id: crypto.randomUUID(),
                    role: 'assistant' as const,
                    content: streamedText,
                    timestamp: new Date(),
                    messageType: 'standard' as const,
                    entitySelection: entitySelectionData,
                  }];
                });
                
                // Clear streaming state since we've finalized the message
                setCurrentStreamingMessage('');
                fullContent = '';
                
                // Also update the plan status to awaiting_recovery
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
                        ...existingMsg.planProgress!,
                        planId: data.planId,
                        status: 'awaiting_recovery',
                      },
                    };
                    return updated;
                  }
                  return prev;
                });
                setIsStreaming(false);
              } else if (data.type === 'plan_cancelled') {
                // Handle plan cancellation
                const cancelledMessage: Message = {
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: data.message || 'Plan cancelled. How else can I help?',
                  timestamp: new Date(),
                  messageType: 'standard',
                };
                setMessages(prev => [...prev, cancelledMessage]);
                setCurrentStreamingMessage('');
                setIsStreaming(false);
              } else if (data.type === 'done') {
                // Skip adding empty messages (clarification/confirmation already handled)
                // But if we have tool results, still show them even if no text content
                if (!fullContent.trim() && pendingToolResults.length === 0) {
                  setIsStreaming(false);
                  setCurrentStreamingMessage('');
                  setCurrentToolName(null);
                  return;
                }
                
                // Finalize message with parsed actions
                const { cleanContent, actions } = parseMessageActions(fullContent);
                
                // Skip if the cleaned content is empty AND no tool results
                if (!cleanContent.trim() && pendingToolResults.length === 0) {
                  setIsStreaming(false);
                  setCurrentStreamingMessage('');
                  setCurrentToolName(null);
                  return;
                }
                
                setMessages(prev => {
                  // Check if we already have a clarification/confirmation message
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.role === 'assistant' && 
                      (lastMsg.messageType === 'clarification' || 
                       lastMsg.messageType === 'confirmation' ||
                       lastMsg.messageType === 'plan_preview')) {
                    // Don't add duplicate - clarification already shown
                    return prev;
                  }
                  
                  if (lastMsg?.id === assistantMessageId) {
                    return [
                      ...prev.slice(0, -1),
                      { 
                        ...lastMsg, 
                        content: cleanContent, 
                        actions,
                        toolResults: pendingToolResults.length > 0 ? pendingToolResults : undefined
                      }
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
                      toolResults: pendingToolResults.length > 0 ? pendingToolResults : undefined
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
        
        // PHASE 2: Improved error messages with recovery options
        let errorContent = 'Sorry, I encountered an error. ';
        let actions: Array<{ action: string; label: string; variant?: 'primary' | 'secondary' | 'danger' }> = [];
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          errorContent = 'I\'m getting too many requests right now. Please wait a moment and try again.';
          actions = [{ action: 'retry', label: '🔄 Try Again', variant: 'primary' }];
        } else if (error.message?.includes('402') || error.message?.includes('payment')) {
          errorContent = 'AI credits have run out. Please add credits to continue using the assistant.';
          actions = [{ action: 'add_credits', label: '💳 Add Credits', variant: 'primary' }];
        } else if (error.message?.includes('timeout') || error.message?.includes('network')) {
          errorContent = 'Connection issue. Please check your internet and try again.';
          actions = [
            { action: 'retry', label: '🔄 Retry', variant: 'primary' },
            { action: 'start_over', label: 'Start Over', variant: 'secondary' }
          ];
        } else {
          errorContent = `Something went wrong: ${error.message}. Would you like to try again?`;
          actions = [
            { action: 'retry', label: '🔄 Try Again', variant: 'primary' },
            { action: 'report_issue', label: '🐛 Report Issue', variant: 'secondary' }
          ];
        }

        // Store the failed message for retry
        setLastFailedMessage({ content, attachments, context });
        
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
          actions,
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } finally {
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      abortControllerRef.current = null;
    }
  }, [businessId, conversationId, getToken, options, uploadMedia, reversibleTools]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    // Abort any ongoing SSE stream first
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    // Reset all state
    setMessages([]);
    setCurrentStreamingMessage('');
    setConversationId(undefined);
    setLastFailedMessage(null);
    setIsStreaming(false);
    setCurrentToolName(null);
    setToolProgress(null);
  }, []);

  // Retry the last failed message
  const retryLastMessage = useCallback(() => {
    if (!lastFailedMessage) {
      toast.error('No failed message to retry');
      return;
    }
    
    // Remove the last error message from the UI
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.actions?.some(a => a.action === 'retry')) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    
    // Also remove the original user message that failed
    setMessages(prev => {
      const lastMsg = prev[prev.length - 1];
      if (lastMsg?.role === 'user' && lastMsg.content === lastFailedMessage.content) {
        return prev.slice(0, -1);
      }
      return prev;
    });
    
    // Resend the message
    sendMessage(lastFailedMessage.content, lastFailedMessage.attachments, lastFailedMessage.context);
  }, [lastFailedMessage, sendMessage]);

  const loadConversation = useCallback(async (convId: string) => {
    if (!businessId) return;
    
    try {
      const token = await getToken();
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

  // Resume a paused plan after recovery action
  const resumePlan = useCallback(async (planId: string) => {
    await sendMessage(`plan_resume:${planId}`);
  }, [sendMessage]);

  // Execute a recovery action for a failed step - always stay in chat
  const executeRecoveryAction = useCallback(async (actionId: string, planId: string, _navigateTo?: string) => {
    // Always send a recovery message instead of navigating
    await sendMessage(`plan_recover:${planId}:${actionId}`);
  }, [sendMessage]);
  
  // Select an entity for plan recovery
  const selectPlanEntity = useCallback(async (planId: string, entityType: string, entityValue: string) => {
    await sendMessage(`plan_entity_select:${planId}:${entityType}:${entityValue}`);
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    currentStreamingMessage,
    currentToolName,
    toolProgress,
    conversationId,
    lastFailedMessage,
    sendMessage,
    stopStreaming,
    clearMessages,
    loadConversation,
    retryLastMessage,
    resumePlan,
    executeRecoveryAction,
    selectPlanEntity,
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
