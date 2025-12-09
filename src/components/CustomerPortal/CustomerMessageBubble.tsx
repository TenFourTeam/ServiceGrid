import React from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CustomerMessage } from '@/hooks/useCustomerMessages';

interface CustomerMessageBubbleProps {
  message: CustomerMessage;
}

export function CustomerMessageBubble({ message }: CustomerMessageBubbleProps) {
  const isOwnMessage = message.is_own_message;
  
  const initials = message.sender_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[85%]',
        isOwnMessage ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback 
          className={cn(
            'text-xs',
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-muted text-muted-foreground'
          )}
        >
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex flex-col', isOwnMessage ? 'items-end' : 'items-start')}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-muted-foreground">
            {message.sender_name}
          </span>
          <span className="text-xs text-muted-foreground/60">
            {format(new Date(message.created_at), 'MMM d, h:mm a')}
          </span>
        </div>

        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isOwnMessage
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
