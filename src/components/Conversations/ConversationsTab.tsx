import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ConversationThread } from './ConversationThread';

export function ConversationsTab() {
  const { conversations, isLoading, createConversation } = useConversations();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = () => {
    const title = prompt('Enter conversation title:');
    if (title) {
      createConversation(title);
    }
  };

  if (selectedConversationId) {
    return (
      <ConversationThread
        conversationId={selectedConversationId}
        onBack={() => setSelectedConversationId(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
          </CardTitle>
          <Button onClick={handleNewConversation} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New
          </Button>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>No conversations yet</p>
            <Button onClick={handleNewConversation} variant="outline" size="sm" className="mt-4">
              Start a conversation
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className="p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium">{conversation.title}</h3>
                    {conversation.unread_count && conversation.unread_count > 0 && (
                      <Badge variant="default" className="ml-2">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>
                  {conversation.latest_message && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      <span className="font-medium">{conversation.latest_sender_name}:</span>{' '}
                      {conversation.latest_message}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}