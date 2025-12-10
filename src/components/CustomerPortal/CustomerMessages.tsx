import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Loader2, ArrowLeft, Paperclip, Building2, Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  useCustomerConversations, 
  useCustomerMessages, 
  useSendCustomerMessage,
  type CustomerConversation 
} from '@/hooks/useCustomerMessages';
import { CustomerMessageBubble } from './CustomerMessageBubble';
import { CustomerMessageComposer } from './CustomerMessageComposer';
import { TimeSeparator } from '@/components/Conversations/TimeSeparator';
import { groupMessagesByDate, shouldGroupWithPrevious } from '@/utils/messageGrouping';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { useCustomerAuth } from '@/hooks/useCustomerAuth';
import { CustomerMessagingHeader } from './CustomerMessagingHeader';
import { useCustomerBusinessContext } from '@/hooks/useCustomerBusinessContext';

export function CustomerMessages() {
  const location = useLocation();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(
    (location.state as any)?.conversationId || null
  );
  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  const { data: conversations, isLoading: conversationsLoading } = useCustomerConversations();
  const { data: messagesData, isLoading: messagesLoading } = useCustomerMessages(selectedConversation);
  const sendMessage = useSendCustomerMessage();
  const { data: jobData } = useCustomerJobData();
  const { customerDetails } = useCustomerAuth();
  const { 
    businesses, 
    activeBusinessId, 
    activeBusiness,
    switchBusiness,
    isSwitching 
  } = useCustomerBusinessContext();

  const businessName = activeBusiness?.name || jobData?.business?.name || customerDetails?.business?.name;
  const businessLogo = activeBusiness?.logo_url || jobData?.business?.logo_url || customerDetails?.business?.logo_url;
  const isMultiBusiness = businesses.length > 1;

  // Get current conversation details
  const currentConversation = useMemo(() => {
    if (!selectedConversation || !conversations) return null;
    return conversations.find(c => c.id === selectedConversation) || null;
  }, [selectedConversation, conversations]);

  // Use messagesData conversation for enriched info (job_title, assigned_worker_name)
  const enrichedConversation = messagesData?.conversation;

  const groupedMessages = useMemo(() => {
    const messages = messagesData?.messages || [];
    return groupMessagesByDate(messages.map(m => ({
      ...m,
      sender_id: m.is_own_message ? 'self' : 'other'
    })));
  }, [messagesData?.messages]);

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    const messages = messagesData?.messages;
    
    // Only scroll when we have messages and loading is complete
    if (messagesLoading || !messages || messages.length === 0) return;
    
    // Use timeout to ensure content is fully rendered
    const timeoutId = setTimeout(() => {
      // Primary: direct viewport scroll
      if (viewportRef.current) {
        viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
      }
      // Fallback: scrollIntoView on anchor
      bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' });
    }, 100);
    
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
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {businessLogo ? (
              <img 
                src={businessLogo} 
                alt={businessName || 'Business'} 
                className="h-10 w-10 rounded-lg object-contain bg-background border hidden sm:block"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-primary/10 items-center justify-center border border-primary/20 hidden sm:flex">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold truncate">
                {enrichedConversation?.assigned_worker_name || businessName || 'Messages'}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {enrichedConversation?.job_title && (
                  <Badge variant="outline" className="text-xs">
                    <Briefcase className="h-3 w-3 mr-1" />
                    {enrichedConversation.job_title}
                  </Badge>
                )}
                {enrichedConversation?.assigned_worker_name && (
                  <Badge variant="secondary" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    Direct Message
                  </Badge>
                )}
                {!enrichedConversation?.job_id && !enrichedConversation?.assigned_worker_id && (
                  <span className="text-sm text-muted-foreground">General conversation</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          {messagesLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
                <div className="space-y-1">
                  {messagesData?.messages?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No messages yet. Start the conversation!</p>
                    </div>
                  ) : (
                    Array.from(groupedMessages.entries()).map(([dateLabel, dateMessages]) => (
                      <div key={dateLabel}>
                        <TimeSeparator label={dateLabel} />
                        {dateMessages.map((message, idx) => {
                          const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                          const isGrouped = shouldGroupWithPrevious(prevMessage, message);
                          const originalMessage = messagesData?.messages?.find(m => m.id === message.id);
                          
                          return originalMessage ? (
                            <div key={message.id} className={isGrouped ? 'mt-1' : 'mt-3'}>
                              <CustomerMessageBubble 
                                message={originalMessage} 
                                conversationId={selectedConversation} 
                                isGrouped={isGrouped}
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    ))
                  )}
                  <div ref={bottomRef} />
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
      {/* Business context header */}
      <CustomerMessagingHeader 
        businessName={businessName}
        businessLogoUrl={businessLogo}
        isMultiBusiness={isMultiBusiness}
        businesses={businesses}
        activeBusinessId={activeBusinessId}
        onSwitchBusiness={switchBusiness}
        isSwitching={isSwitching}
      />

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-medium truncate">
                        {conv.assigned_worker_name || conv.title || 'Conversation'}
                      </span>
                      {!conv.last_message_from_customer && conv.last_message && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                          New reply
                        </span>
                      )}
                    </div>
                    {/* Context badges */}
                    {(conv.job_title || conv.assigned_worker_name) && (
                      <div className="flex items-center gap-2 mt-1">
                        {conv.job_title && (
                          <Badge variant="outline" className="text-xs">
                            <Briefcase className="h-3 w-3 mr-1" />
                            {conv.job_title}
                          </Badge>
                        )}
                        {conv.assigned_worker_name && (
                          <Badge variant="secondary" className="text-xs">
                            <User className="h-3 w-3 mr-1" />
                            Direct
                          </Badge>
                        )}
                      </div>
                    )}
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
              Have a question or need to discuss something with {businessName || 'your contractor'}? 
              Send them a message below.
            </p>
          </CardContent>
          <CustomerMessageComposer
            onSend={handleSendMessage}
            isSending={sendMessage.isPending}
            placeholder={`Send a message to ${businessName || 'your contractor'}...`}
          />
        </Card>
      )}
    </div>
  );
}
