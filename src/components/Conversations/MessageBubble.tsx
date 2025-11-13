import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    edited: boolean;
    sender_id: string;
    sender?: {
      id: string;
      full_name: string;
    };
    attachments?: any[];
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { userId } = useBusinessContext();
  const isOwnMessage = message.sender_id === userId;

  return (
    <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Avatar className="flex-shrink-0">
        <AvatarFallback>
          {message.sender?.full_name?.split(' ').map(n => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium">{message.sender?.full_name}</span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
          </span>
          {message.edited && (
            <Badge variant="secondary" className="text-xs">Edited</Badge>
          )}
        </div>
        <div
          className={`inline-block px-4 py-2 rounded-lg ${
            isOwnMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">
            {/* Render message with mentions highlighted */}
            {message.content.split(/(@\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
              // Check if this part is a mention
              const mentionMatch = part.match(/@\[([^\]]+)\]\(([^)]+)\)/);
              if (mentionMatch) {
                const [, displayName] = mentionMatch;
                return (
                  <Badge key={i} variant="secondary" className="text-xs mx-1 inline-flex">
                    @{displayName}
                  </Badge>
                );
              }
              // Regular text
              return part ? <span key={i}>{part}</span> : null;
            })}
          </p>
        </div>
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2">
            <Badge variant="outline">📎 {message.attachments.length} attachments</Badge>
          </div>
        )}
      </div>
    </div>
  );
}