import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Loader2, ArrowLeft, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  useCustomerConversations, 
  useCustomerMessages, 
  useSendCustomerMessage,
  type CustomerConversation 
} from '@/hooks/useCustomerMessages';
import { CustomerMessageBubble } from './CustomerMessageBubble';
import { CustomerMessageComposer } from './CustomerMessageComposer';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function CustomerMessages() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: conversations, isLoading: conversationsLoading } = useCustomerConversations();
  const { data: messagesData, isLoading: messagesLoading } = useCustomerMessages(selectedConversation);
  const sendMessage = useSendCustomerMessage();

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    const messages = messagesData?.messages;
    
    // Only scroll when we have messages and loading is complete
    if (messagesLoading || !messages || messages.length === 0) return;
    
    // Use setTimeout to ensure content is fully rendered
    const timeoutId = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [messagesData?.messages, messagesLoading]);

  const handleSendMessage = (content: string, attachments?: string[]) => {
    sendMessage.mutate({ 
      content, 
      conversationId: selectedConversation || undefined,
      attachments 
    });
  };

  // If no conversation exists, show the composer to start one
  const hasConversations = conversations && conversations.length > 0;

  if (conversationsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Viewing a specific conversation
  if (selectedConversation) {
    return (
      <div className="space-y-4 h-full flex flex-col">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedConversation(null)}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">Messages</h2>
            <p className="text-sm text-muted-foreground">
              Chat with your contractor
            </p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          {messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" viewportRef={scrollRef}>
                <div className="space-y-4">
                  {messagesData?.messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    messagesData?.messages?.map((message) => (
                      <CustomerMessageBubble key={message.id} message={message} conversationId={selectedConversation} />
                    ))
                  )}
                </div>
              </ScrollArea>
              <CustomerMessageComposer
                conversationId={selectedConversation}
                onSend={handleSendMessage}
                isSending={sendMessage.isPending}
                placeholder="Type a message to your contractor..."
              />
            </>
          )}
        </Card>
      </div>
    );
  }

  // Conversation list or new conversation view
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Messages</h2>
        <p className="text-muted-foreground">
          Communicate with your contractor
        </p>
      </div>

      {hasConversations ? (
        <div className="space-y-3">
          {conversations.map((conv: CustomerConversation) => (
            <Card
              key={conv.id}
              className={cn(
                'cursor-pointer transition-colors hover:bg-muted/50',
                !conv.last_message_from_customer && 'border-primary/20 bg-primary/5'
              )}
              onClick={() => setSelectedConversation(conv.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {conv.title || 'Conversation'}
                      </span>
                      {!conv.last_message_from_customer && conv.last_message && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          New reply
                        </span>
                      )}
                    </div>
                    {(conv.last_message || conv.has_attachments) && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2 flex items-center gap-1">
                        {conv.has_attachments && !conv.last_message && <Paperclip className="h-3 w-3" />}
                        {conv.last_message || (conv.has_attachments ? 'Attachment' : '')}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(conv.last_message_at), 'MMM d')}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <MessageSquare className="h-5 w-5" />
              Start a Conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-0">
            <p className="text-sm text-muted-foreground mb-4">
              Have a question or need to discuss something with your contractor? 
              Send them a message below.
            </p>
          </CardContent>
          <CustomerMessageComposer
            onSend={handleSendMessage}
            isSending={sendMessage.isPending}
            placeholder="Type your message to start a conversation..."
          />
        </Card>
      )}
    </div>
  );
}
