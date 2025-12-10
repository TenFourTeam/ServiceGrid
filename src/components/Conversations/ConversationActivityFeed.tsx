import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { FileText, Users, Archive, ArchiveRestore } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useConversationActivity, type ConversationActivityEvent } from '@/hooks/useConversationActivity';

interface ConversationActivityFeedProps {
  conversationId: string;
}

function getEventIcon(eventType: ConversationActivityEvent['event_type']) {
  switch (eventType) {
    case 'created':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'reassigned':
      return <Users className="h-4 w-4 text-blue-600" />;
    case 'archived':
      return <Archive className="h-4 w-4 text-orange-600" />;
    case 'unarchived':
      return <ArchiveRestore className="h-4 w-4 text-green-600" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatEventMessage(event: ConversationActivityEvent) {
  const metadata = event.metadata || {};

  switch (event.event_type) {
    case 'created':
      if (metadata.initial_worker_name) {
        return <>created this conversation and assigned to <span className="font-medium">{metadata.initial_worker_name}</span></>;
      }
      return 'created this conversation';
    case 'reassigned':
      if (metadata.from_worker_name && metadata.to_worker_name) {
        return <>reassigned from <span className="font-medium">{metadata.from_worker_name}</span> to <span className="font-medium">{metadata.to_worker_name}</span></>;
      } else if (metadata.to_worker_name) {
        return <>assigned to <span className="font-medium">{metadata.to_worker_name}</span></>;
      } else if (metadata.from_worker_name) {
        return <>unassigned from <span className="font-medium">{metadata.from_worker_name}</span></>;
      }
      return 'updated assignment';
    case 'archived':
      return 'archived this conversation';
    case 'unarchived':
      return 'unarchived this conversation';
    default:
      return 'performed an action';
  }
}

function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function groupEventsByDate(events: ConversationActivityEvent[]): Map<string, ConversationActivityEvent[]> {
  const groups = new Map<string, ConversationActivityEvent[]>();
  
  events.forEach(event => {
    const date = new Date(event.created_at);
    const label = getDateGroupLabel(date);
    
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(event);
  });
  
  return groups;
}

function getUserInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  return email.slice(0, 2).toUpperCase();
}

export function ConversationActivityFeed({ conversationId }: ConversationActivityFeedProps) {
  const { data: events, isLoading } = useConversationActivity(conversationId);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
        <FileText className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No activity yet
        </p>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-4 p-4">
      {Array.from(groupedEvents.entries()).map(([dateLabel, dateEvents]) => (
        <div key={dateLabel} className="space-y-3">
          {/* Date Header */}
          <div className="flex items-center gap-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {dateLabel}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Activity Items */}
          <div className="space-y-2">
            {dateEvents.map(event => {
              const userName = event.user?.name || event.user?.email.split('@')[0] || 'Unknown User';
              const userInitials = getUserInitials(event.user?.name || null, event.user?.email || '');

              return (
                <div key={event.id} className="flex gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-1.5">
                      <div className="mt-0.5">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{userName}</span>
                          {' '}{formatEventMessage(event)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
