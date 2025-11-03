import { useState, useCallback, useRef } from 'react';
import { useBusinessContext } from './useBusinessContext';
import { useAuth } from '@clerk/clerk-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  toolCalls?: Array<{
    tool: string;
    status: 'executing' | 'complete';
    result?: any;
  }>;
  actions?: Array<{
    action: string;
    label: string;
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

  const sendMessage = useCallback(async (content: string, context?: any) => {
    if (!businessId || !content.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
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
              } else if (data.type === 'token') {
                fullContent += data.content;
                setCurrentStreamingMessage(fullContent);
                setCurrentToolName(null); // Clear tool name when streaming starts
              } else if (data.type === 'tool_call') {
                // Show tool execution indicator
                setCurrentToolName(data.tool);
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.id === assistantMessageId) {
                    return [
                      ...prev.slice(0, -1),
                      {
                        ...lastMsg,
                        toolCalls: [
                          ...(lastMsg.toolCalls || []),
                          { tool: data.tool, status: 'executing' as const }
                        ]
                      }
                    ];
                  }
                  return [
                    ...prev,
                    {
                      id: assistantMessageId,
                      role: 'assistant' as const,
                      content: fullContent,
                      timestamp: new Date(),
                      toolCalls: [{ tool: data.tool, status: 'executing' as const }]
                    }
                  ];
                });
              } else if (data.type === 'tool_result') {
                // Update tool result
                setMessages(prev => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg?.id === assistantMessageId && lastMsg.toolCalls) {
                    const updatedToolCalls = lastMsg.toolCalls.map(tc =>
                      tc.tool === data.tool
                        ? { ...tc, status: 'complete' as const, result: data.result }
                        : tc
                    );
                    return [
                      ...prev.slice(0, -1),
                      { ...lastMsg, toolCalls: updatedToolCalls }
                    ];
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
  actions: Array<{ action: string; label: string }> 
} {
  const actions: Array<{ action: string; label: string }> = [];
  
  // Extract [BUTTON:action:label] syntax
  const buttonRegex = /\[BUTTON:([^:]+):([^\]]+)\]/g;
  const cleanContent = content.replace(buttonRegex, (match, action, label) => {
    actions.push({ action: action.trim(), label: label.trim() });
    return ''; // Remove button syntax from content
  }).trim();
  
  return { cleanContent, actions };
}
