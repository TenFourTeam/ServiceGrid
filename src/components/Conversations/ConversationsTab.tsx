import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus, Search, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ConversationThread } from './ConversationThread';

export function ConversationsTab() {
  const { conversations, isLoading, createConversation } = useConversations();
  const { unreadCount } = useUnreadMentions();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState('');

  const filteredConversations = conversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleNewConversation = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateConversation = () => {
    if (newConversationTitle.trim()) {
      createConversation(newConversationTitle.trim());
      setNewConversationTitle('');
      setIsCreateDialogOpen(false);
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
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Conversations
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 flex items-center justify-center px-1">
                {unreadCount}
              </Badge>
            )}
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
              {filteredConversations.map((conversation) => {
                const isCustomerChat = !!conversation.customer_id;
                return (
                  <div
                    key={conversation.id}
                    onClick={() => setSelectedConversationId(conversation.id)}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                      isCustomerChat && "border-primary/20 bg-primary/5"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {isCustomerChat && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <User className="h-3 w-3" />
                            Customer
                          </Badge>
                        )}
                        <h3 className="font-medium">
                          {isCustomerChat ? conversation.customer_name : conversation.title}
                        </h3>
                      </div>
                      {conversation.unread_count && conversation.unread_count > 0 && (
                        <Badge variant="default" className="ml-2">
                          {conversation.unread_count}
                        </Badge>
                      )}
                      {isCustomerChat && conversation.latest_sender_type === 'customer' && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          New
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
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>

    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Conversation</DialogTitle>
          <DialogDescription>
            Start a new team conversation. Give it a descriptive title.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Conversation Title</Label>
            <Input
              id="title"
              placeholder="e.g., Project Updates, Team Coordination..."
              value={newConversationTitle}
              onChange={(e) => setNewConversationTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newConversationTitle.trim()) {
                  handleCreateConversation();
                }
              }}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsCreateDialogOpen(false);
              setNewConversationTitle('');
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateConversation}
            disabled={!newConversationTitle.trim()}
          >
            Create Conversation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}