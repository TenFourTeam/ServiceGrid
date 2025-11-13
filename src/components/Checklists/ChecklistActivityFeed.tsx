import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { CheckCircle2, XCircle, UserCircle, AlertCircle, FileText } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useChecklistActivity, type ChecklistActivityEvent } from '@/hooks/useChecklistActivity';
import { cn } from '@/lib/utils';

interface ChecklistActivityFeedProps {
  checklistId: string;
}

function getEventIcon(eventType: ChecklistActivityEvent['event_type']) {
  switch (eventType) {
    case 'created':
      return <FileText className="h-4 w-4 text-muted-foreground" />;
    case 'item_completed':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case 'item_uncompleted':
      return <XCircle className="h-4 w-4 text-orange-600" />;
    case 'photo_required_failed':
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'checklist_assigned':
    case 'item_assigned':
      return <UserCircle className="h-4 w-4 text-blue-600" />;
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />;
  }
}

function formatEventMessage(event: ChecklistActivityEvent) {
  const itemTitle = event.item?.title ? `"${event.item.title}"` : 'item';
  const assignedUser = event.metadata?.assigned_to_name || 'a user';

  switch (event.event_type) {
    case 'created':
      return 'created this checklist';
    case 'item_completed':
      return <>completed {itemTitle}</>;
    case 'item_uncompleted':
      return <>uncompleted {itemTitle}</>;
    case 'photo_required_failed':
      return (
        <>
          attempted to complete {itemTitle} <span className="text-destructive">without required photos</span>
        </>
      );
    case 'checklist_assigned':
      return <>assigned this checklist to {assignedUser}</>;
    case 'item_assigned':
      return <>assigned {itemTitle} to {assignedUser}</>;
    default:
      return 'performed an action';
  }
}

function getDateGroupLabel(date: Date): string {
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMMM d, yyyy');
}

function groupEventsByDate(events: ChecklistActivityEvent[]): Map<string, ChecklistActivityEvent[]> {
  const groups = new Map<string, ChecklistActivityEvent[]>();
  
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

export function ChecklistActivityFeed({ checklistId }: ChecklistActivityFeedProps) {
  const { data: events, isLoading } = useChecklistActivity(checklistId);

  if (isLoading) {
    return (
      <div className="space-y-4 py-4">
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
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No activity yet
        </p>
      </div>
    );
  }

  const groupedEvents = groupEventsByDate(events);

  return (
    <div className="space-y-6 py-4">
      {Array.from(groupedEvents.entries()).map(([dateLabel, dateEvents]) => (
        <div key={dateLabel} className="space-y-4">
          {/* Date Header */}
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-muted-foreground">
              {dateLabel}
            </div>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Activity Items */}
          <div className="space-y-3">
            {dateEvents.map(event => {
              const userName = event.user?.name || event.user?.email.split('@')[0] || 'Unknown User';
              const userInitials = getUserInitials(event.user?.name || null, event.user?.email || '');

              return (
                <div key={event.id} className="flex gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5">
                        {getEventIcon(event.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium">{userName}</span>
                          {' '}{formatEventMessage(event)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
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
