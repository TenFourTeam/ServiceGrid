import { useEffect, useRef } from 'react';
import { useMessages } from '@/hooks/useMessages';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft } from 'lucide-react';
import { MessageComposer } from './MessageComposer';
import { MessageBubble } from './MessageBubble';

interface ConversationThreadProps {
  conversationId: string;
  onBack: () => void;
  title?: string;
  isCustomerChat?: boolean;
}

export function ConversationThread({ conversationId, onBack, title, isCustomerChat }: ConversationThreadProps) {
  const { messages, isLoading, sendMessage } = useMessages(conversationId);
  const viewportRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      <CardHeader className="border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle>{isCustomerChat ? `Customer: ${title}` : title || 'Team Chat'}</CardTitle>
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
            <div className="space-y-4">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
        <div className="border-t p-4 flex-shrink-0">
          <MessageComposer 
            conversationId={conversationId}
            onSend={(content, attachments) => sendMessage({ content, attachments })} 
          />
        </div>
      </CardContent>
    </Card>
  );
}