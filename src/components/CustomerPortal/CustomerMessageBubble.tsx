import React, { useState } from 'react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { FileText, MoreVertical, Pencil, Trash2, X, Check } from 'lucide-react';
import type { CustomerMessage, CustomerMessageAttachment } from '@/hooks/useCustomerMessages';
import { useEditCustomerMessage, useDeleteCustomerMessage } from '@/hooks/useCustomerMessages';
import { MediaViewer } from '@/components/Jobs/MediaViewer';
import type { MediaItem } from '@/hooks/useJobMedia';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CustomerMessageBubbleProps {
  message: CustomerMessage;
  conversationId: string;
}

export function CustomerMessageBubble({ message, conversationId }: CustomerMessageBubbleProps) {
  const isOwnMessage = message.is_own_message;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content || '');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const editMutation = useEditCustomerMessage();
  const deleteMutation = useDeleteCustomerMessage();

  // Check if within 15-minute edit/delete window
  const minutesSinceCreation = (Date.now() - new Date(message.created_at).getTime()) / 60000;
  const canEditOrDelete = isOwnMessage && minutesSinceCreation <= 15;
  
  const initials = message.sender_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';

  const attachments = message.attachments || [];
  const hasAttachments = attachments.length > 0;
  const hasContent = message.content && message.content.trim().length > 0;

  // Convert attachments to MediaItem format for MediaViewer
  const mediaItems: MediaItem[] = attachments
    .filter(att => att.type === 'image' || att.type === 'video')
    .map((att, idx) => ({
      id: `${message.id}-${idx}`,
      public_url: att.url,
      thumbnail_url: att.thumbnail_url || att.url,
      file_type: att.type === 'video' ? 'video' : 'photo',
      original_filename: att.name || 'Attachment',
      upload_status: 'completed' as const,
      mime_type: att.type === 'video' ? 'video/mp4' : 'image/jpeg',
      file_size: 0,
      created_at: message.created_at,
    }));

  const handleMediaClick = (attachmentIndex: number) => {
    const mediaOnlyIndex = attachments
      .slice(0, attachmentIndex + 1)
      .filter(att => att.type === 'image' || att.type === 'video')
      .length - 1;
    setViewerIndex(Math.max(0, mediaOnlyIndex));
    setViewerOpen(true);
  };

  const handleEditSave = () => {
    if (!editContent.trim()) {
      toast.error('Message cannot be empty');
      return;
    }

    editMutation.mutate(
      { messageId: message.id, content: editContent.trim(), conversationId },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success('Message updated');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const handleEditCancel = () => {
    setEditContent(message.content || '');
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { messageId: message.id, conversationId },
      {
        onSuccess: () => {
          setShowDeleteDialog(false);
          toast.success('Message deleted');
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  const renderAttachment = (attachment: CustomerMessageAttachment, index: number) => {
    const isImage = attachment.type === 'image';
    const isVideo = attachment.type === 'video';

    if (isImage) {
      const displayUrl = attachment.thumbnail_url || attachment.url;
      return (
        <div 
          key={index} 
          className="relative cursor-pointer overflow-hidden rounded-lg"
          onClick={() => handleMediaClick(index)}
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
      return (
        <div 
          key={index} 
          className="relative cursor-pointer overflow-hidden rounded-lg"
          onClick={() => handleMediaClick(index)}
        >
          <img
            src={attachment.thumbnail_url || attachment.url}
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

    // Generic file - open in new tab
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
          'flex gap-3 max-w-[85%] group',
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
            {message.edited && (
              <span className="text-xs text-muted-foreground/50 italic">(edited)</span>
            )}
          </div>

          <div className="flex items-start gap-1">
            {/* Message content */}
            <div className={cn('flex flex-col gap-2', isOwnMessage ? 'items-end' : 'items-start')}>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="min-w-[200px]"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleEditSave();
                      } else if (e.key === 'Escape') {
                        handleEditCancel();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleEditSave}
                    disabled={editMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={handleEditCancel}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                hasContent && (
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
                )
              )}

              {hasAttachments && !isEditing && (
                <div className={cn(
                  'flex flex-wrap gap-2',
                  isOwnMessage ? 'justify-end' : 'justify-start'
                )}>
                  {attachments.map((attachment, index) => renderAttachment(attachment, index))}
                </div>
              )}
            </div>

            {/* Edit/Delete dropdown - only show for own messages within 15 min */}
            {canEditOrDelete && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align={isOwnMessage ? 'end' : 'start'}>
                  {hasContent && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>

      {/* Media Viewer */}
      {mediaItems.length > 0 && (
        <MediaViewer
          media={mediaItems}
          initialIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete message?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The message will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
