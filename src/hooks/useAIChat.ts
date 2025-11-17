import { useState, useCallback, useRef } from 'react';
import { useBusinessContext } from './useBusinessContext';
import { useAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';

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

  const sendMessage = useCallback(async (content: string, attachments?: File[], context?: any) => {
    if (!businessId || (!content.trim() && (!attachments || attachments.length === 0))) return;

    // Upload attachments first if any
    let mediaIds: string[] = [];
    if (attachments && attachments.length > 0) {
      try {
        const { useConversationMediaUpload } = await import('./useConversationMediaUpload');
        const uploadPromises = attachments.map(async (file) => {
          const { uploadMedia } = useConversationMediaUpload();
          const result = await uploadMedia(file, {
            conversationId: conversationId || 'temp',
            onProgress: (progress) => {
              console.log(`Upload progress: ${progress}%`);
            }
          });
          return result.mediaId;
        });
        
        mediaIds = await Promise.all(uploadPromises);
      } catch (error) {
        console.error('Error uploading attachments:', error);
        toast.error('Failed to upload images. Please try again.');
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

      if (!response.ok) {
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

  return {
    messages,
    isStreaming,
    currentStreamingMessage,
    currentToolName,
    conversationId,
    sendMessage,
    stopStreaming,
    clearMessages,
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
