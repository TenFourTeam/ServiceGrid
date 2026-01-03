import { useState } from 'react';
import { useConversations } from '@/hooks/useConversations';
import { useUnreadMentions } from '@/hooks/useUnreadMentions';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, Plus, Search, User, Paperclip, Briefcase, UserCheck, Users, Filter, Archive } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { ConversationThread } from './ConversationThread';
import { NewConversationDialog } from './NewConversationDialog';

type ConversationFilter = 'all' | 'my-direct' | 'customer' | 'team';

export function ConversationsTab() {
  const { conversations, isLoading, createConversation, createCustomerConversation, reassignConversation, archiveConversation, unarchiveConversation } = useConversations();
  const { unreadCount } = useUnreadMentions();
  const { profile } = useBusinessAuth();
  const [selectedConversation, setSelectedConversation] = useState<{ 
    id: string; 
    title: string; 
    isCustomer: boolean; 
    customerId?: string; 
    customerName?: string;
    jobId?: string;
    jobTitle?: string;
    assignedWorkerId?: string;
    assignedWorkerName?: string;
    isArchived: boolean;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ConversationFilter>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const currentUserId = profile?.id;

  // Enhanced search: include job_title and assigned_worker_name
  const searchFiltered = conversations.filter(c => {
    const query = searchQuery.toLowerCase();
    if (!query) return true;
    return (
      (c.title || '').toLowerCase().includes(query) ||
      (c.customer_name || '').toLowerCase().includes(query) ||
      (c.job_title || '').toLowerCase().includes(query) ||
      (c.assigned_worker_name || '').toLowerCase().includes(query)
    );
  });

  // Apply filter type AND archived filter
  const filteredConversations = searchFiltered.filter(c => {
    // Hide archived unless showArchived is enabled
    if (!showArchived && c.is_archived) return false;
    
    switch (filterType) {
      case 'my-direct':
        return c.assigned_worker_id === currentUserId;
      case 'customer':
        return !!c.customer_id;
      case 'team':
        return !c.customer_id;
      default:
        return true;
    }
  });

  const handleNewConversation = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCreateTeamConversation = (title: string) => {
    createConversation(title);
  };

  const handleCreateCustomerConversation = (
    customerId: string, 
    customerName: string, 
    options?: { 
      initialReference?: { type: 'job' | 'quote' | 'invoice'; id: string; title: string }; 
      jobId?: string; 
      workerId?: string; 
    }
  ) => {
    createCustomerConversation({ 
      customerId, 
      customerName, 
      initialReference: options?.initialReference,
      jobId: options?.jobId,
      workerId: options?.workerId,
    });
  };

  if (selectedConversation) {
    const currentUser = profile ? {
      id: profile.id,
      name: profile.fullName,
      email: profile.email,
    } : undefined;

    return (
      <ConversationThread
        conversationId={selectedConversation.id}
        onBack={() => setSelectedConversation(null)}
        title={selectedConversation.title}
        isCustomerChat={selectedConversation.isCustomer}
        customerId={selectedConversation.customerId}
        customerName={selectedConversation.customerName}
        jobId={selectedConversation.jobId}
        jobTitle={selectedConversation.jobTitle}
        assignedWorkerId={selectedConversation.assignedWorkerId}
        assignedWorkerName={selectedConversation.assignedWorkerName}
        onReassign={(workerId, context) => {
          reassignConversation({ 
            conversationId: selectedConversation.id, 
            workerId,
            optimisticContext: currentUser ? {
              currentUser,
              fromWorkerName: context?.fromWorkerName,
              toWorkerName: context?.toWorkerName,
            } : undefined,
          });
        }}
        isArchived={selectedConversation.isArchived}
        onArchive={() => {
          archiveConversation({ 
            conversationId: selectedConversation.id,
            optimisticContext: currentUser ? { currentUser } : undefined,
          });
          setSelectedConversation(null);
        }}
        onUnarchive={() => {
          unarchiveConversation({ 
            conversationId: selectedConversation.id,
            optimisticContext: currentUser ? { currentUser } : undefined,
          });
          setSelectedConversation(prev => prev ? { ...prev, isArchived: false } : null);
        }}
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
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations, jobs, workers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v as ConversationFilter)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  All Conversations
                </div>
              </SelectItem>
              <SelectItem value="my-direct">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  My Direct Messages
                </div>
              </SelectItem>
              <SelectItem value="customer">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Chats
                </div>
              </SelectItem>
              <SelectItem value="team">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team Chats
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived" className="text-sm text-muted-foreground flex items-center gap-1 cursor-pointer whitespace-nowrap">
              <Archive className="h-3.5 w-3.5" />
              Show Archived
            </Label>
          </div>
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
                  onClick={() => setSelectedConversation({
                      id: conversation.id,
                      title: isCustomerChat ? conversation.customer_name || 'Customer' : conversation.title,
                      isCustomer: isCustomerChat,
                      customerId: conversation.customer_id,
                      customerName: isCustomerChat ? conversation.customer_name : undefined,
                      jobId: conversation.job_id,
                      jobTitle: conversation.job_title,
                      assignedWorkerId: conversation.assigned_worker_id,
                      assignedWorkerName: conversation.assigned_worker_name,
                      isArchived: conversation.is_archived || false,
                    })}
                    className={cn(
                      "p-4 rounded-lg border cursor-pointer hover:bg-accent transition-colors",
                      isCustomerChat && "border-primary/20 bg-primary/5",
                      conversation.is_archived && "opacity-60"
                    )}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isCustomerChat && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0">
                            <User className="h-3 w-3" />
                            Customer
                          </Badge>
                        )}
                        {conversation.job_title && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0">
                            <Briefcase className="h-3 w-3" />
                            {conversation.job_title}
                          </Badge>
                        )}
                        {conversation.assigned_worker_name && (
                          <Badge variant="outline" className="text-xs gap-1 shrink-0 border-primary/30 text-primary">
                            <UserCheck className="h-3 w-3" />
                            {conversation.assigned_worker_name}
                          </Badge>
                        )}
                        {conversation.is_archived && (
                          <Badge variant="secondary" className="text-xs gap-1 shrink-0 bg-muted text-muted-foreground">
                            <Archive className="h-3 w-3" />
                            Archived
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
                    {(conversation.latest_message || (conversation as any).has_attachments) && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2 flex items-center gap-1">
                        {conversation.latest_sender_name && <span className="font-medium">{conversation.latest_sender_name}:</span>}
                        {(conversation as any).has_attachments && !conversation.latest_message && <Paperclip className="h-3 w-3" />}
                        {conversation.latest_message || ((conversation as any).has_attachments ? 'Attachment' : '')}
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

    <NewConversationDialog
      open={isCreateDialogOpen}
      onOpenChange={setIsCreateDialogOpen}
      onCreateTeamConversation={handleCreateTeamConversation}
      onCreateCustomerConversation={handleCreateCustomerConversation}
    />
    </>
  );
}