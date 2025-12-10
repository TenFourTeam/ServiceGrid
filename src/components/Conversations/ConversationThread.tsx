import { useEffect, useRef, useMemo, useState } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, User } from 'lucide-react';
import { MessageComposer } from './MessageComposer';
import { MessageBubble } from './MessageBubble';
import { TimeSeparator } from './TimeSeparator';
import { groupMessagesByDate, shouldGroupWithPrevious } from '@/utils/messageGrouping';
import JobShowModal from '@/components/Jobs/JobShowModal';
import { QuoteDetailsModal } from '@/components/Quotes/QuoteDetailsModal';
import InvoiceModal from '@/components/Invoices/InvoiceModal';
import { useJobsData } from '@/hooks/useJobsData';
import { useInvoicesData } from '@/hooks/useInvoicesData';

interface ConversationThreadProps {
  conversationId: string;
  onBack: () => void;
  title?: string;
  isCustomerChat?: boolean;
  customerId?: string;
  customerName?: string;
}

export function ConversationThread({ conversationId, onBack, title, isCustomerChat, customerId, customerName }: ConversationThreadProps) {
  const { messages, isLoading, sendMessage, editMessage, deleteMessage } = useMessages(conversationId);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  
  // Fetch entities for modal display
  const { data: jobs = [] } = useJobsData();
  const { data: invoices = [] } = useInvoicesData();
  
  // Entity modal state
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const selectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);
  const selectedInvoice = useMemo(() => invoices.find(i => i.id === selectedInvoiceId), [invoices, selectedInvoiceId]);

  const handleEntityClick = (type: 'job' | 'quote' | 'invoice', id: string) => {
    switch (type) {
      case 'job':
        setSelectedJobId(id);
        break;
      case 'quote':
        setSelectedQuoteId(id);
        break;
      case 'invoice':
        setSelectedInvoiceId(id);
        break;
    }
  };

  const handleEditMessage = (messageId: string, content: string) => {
    editMessage({ messageId, content });
  };

  const handleDeleteMessage = (messageId: string) => {
    deleteMessage(messageId);
  };

  const groupedMessages = useMemo(() => {
    return groupMessagesByDate(messages);
  }, [messages]);

  // Auto-scroll to bottom when messages load or change
  useEffect(() => {
    // Only scroll when we have messages and loading is complete
    if (isLoading || messages.length === 0) return;
    
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
  }, [messages, isLoading]);

  return (
    <Card className="flex flex-col h-[calc(100vh-200px)]">
      <CardHeader className="border-b flex-shrink-0 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isCustomerChat && (
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base truncate">
                  {customerName || title || (isCustomerChat ? 'Customer Chat' : 'Team Chat')}
                </CardTitle>
                {isCustomerChat && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary shrink-0">
                    Customer
                  </Badge>
                )}
              </div>
              {isCustomerChat && customerName && title && customerName !== title && (
                <p className="text-xs text-muted-foreground truncate">{title}</p>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        <ScrollArea className="flex-1 p-4" viewportRef={viewportRef}>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-1">
              {Array.from(groupedMessages.entries()).map(([dateLabel, dateMessages]) => (
                <div key={dateLabel}>
                  <TimeSeparator label={dateLabel} />
                  {dateMessages.map((message, idx) => {
                    const prevMessage = idx > 0 ? dateMessages[idx - 1] : null;
                    const isGrouped = shouldGroupWithPrevious(prevMessage, message);
                    
                    return (
                      <div key={message.id} className={isGrouped ? 'mt-1' : 'mt-3'}>
                        <MessageBubble 
                          message={message} 
                          isGrouped={isGrouped} 
                          onEntityClick={handleEntityClick}
                          onEdit={handleEditMessage}
                          onDelete={handleDeleteMessage}
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-4 flex-shrink-0">
          <MessageComposer 
            conversationId={conversationId}
            customerId={customerId}
            onSend={(content, attachments) => sendMessage({ content, attachments })} 
          />
        </div>
      </CardContent>

      {/* Entity Modals */}
      {selectedJob && (
        <JobShowModal
          job={selectedJob}
          open={!!selectedJob}
          onOpenChange={(open) => !open && setSelectedJobId(null)}
        />
      )}

      {selectedQuoteId && (
        <QuoteDetailsModal
          quoteId={selectedQuoteId}
          open={!!selectedQuoteId}
          onOpenChange={(open) => !open && setSelectedQuoteId(null)}
        />
      )}

      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          open={!!selectedInvoice}
          onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
        />
      )}
    </Card>
  );
}
