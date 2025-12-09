import React, { useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FileText } from 'lucide-react';
import type { CustomerMessage, CustomerMessageAttachment } from '@/hooks/useCustomerMessages';

interface CustomerMessageBubbleProps {
  message: CustomerMessage;
}

export function CustomerMessageBubble({ message }: CustomerMessageBubbleProps) {
  const isOwnMessage = message.is_own_message;
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  
  const initials = message.sender_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const attachments = message.attachments || [];
  const hasAttachments = attachments.length > 0;
  const hasContent = message.content && message.content.trim().length > 0;

  const renderAttachment = (attachment: CustomerMessageAttachment, index: number) => {
    // Use simplified type from edge function: 'image', 'video', 'file'
    const isImage = attachment.type === 'image';
    const isVideo = attachment.type === 'video';

    if (isImage) {
      // Use thumbnail for display if available, full URL for lightbox
      const displayUrl = attachment.thumbnail_url || attachment.url;
      return (
        <div 
          key={index} 
          className="relative cursor-pointer overflow-hidden rounded-lg"
          onClick={() => setExpandedImage(attachment.url)}
        >
          <img
            src={displayUrl}
            alt={attachment.name || 'Attachment'}
            className="max-w-[200px] max-h-[200px] object-cover rounded-lg hover:opacity-90 transition-opacity"
          />
        </div>
      );
    }

    if (isVideo) {
      // Show thumbnail for video if available, otherwise show video player
      if (attachment.thumbnail_url) {
        return (
          <div 
            key={index} 
            className="relative cursor-pointer overflow-hidden rounded-lg"
            onClick={() => window.open(attachment.url, '_blank')}
          >
            <img
              src={attachment.thumbnail_url}
              alt={attachment.name || 'Video thumbnail'}
              className="max-w-[200px] max-h-[200px] object-cover rounded-lg"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
              <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-primary border-b-[6px] border-b-transparent ml-1" />
              </div>
            </div>
          </div>
        );
      }
      
      return (
        <div key={index} className="relative overflow-hidden rounded-lg">
          <video
            src={attachment.url}
            controls
            className="max-w-[250px] max-h-[200px] rounded-lg"
          />
        </div>
      );
    }

    // Generic file
    return (
      <a
        key={index}
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs truncate max-w-[150px]">
          {attachment.name || 'File'}
        </span>
      </a>
    );
  };

  return (
    <>
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

          {hasContent && (
            <div
              className={cn(
                'rounded-2xl px-4 py-2 text-sm',
                isOwnMessage
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted text-foreground rounded-tl-sm',
                hasAttachments && 'mb-2'
              )}
            >
              <p className="whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}

          {hasAttachments && (
            <div className={cn(
              'flex flex-wrap gap-2',
              isOwnMessage ? 'justify-end' : 'justify-start'
            )}>
              {attachments.map((attachment, index) => renderAttachment(attachment, index))}
            </div>
          )}
        </div>
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded attachment"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
          />
        </div>
      )}
    </>
  );
}
