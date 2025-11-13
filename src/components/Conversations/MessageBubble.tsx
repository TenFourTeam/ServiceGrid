import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { useConversationMedia } from '@/hooks/useConversationMedia';
import { useState } from 'react';
import { MediaViewer } from '@/components/Jobs/MediaViewer';
import { Video, Loader2 } from 'lucide-react';

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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const attachmentIds = message.attachments ? 
    (typeof message.attachments === 'string' ? JSON.parse(message.attachments) : message.attachments) 
    : [];

  const { data: mediaItems = [], isLoading: mediaLoading } = useConversationMedia(
    attachmentIds.length > 0 ? attachmentIds : undefined
  );

  const senderName = message.sender?.full_name || 'Unknown';

  return (
    <>
      <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarFallback className="text-xs">
            {senderName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">{senderName}</span>
            <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
            {message.edited && <Badge variant="outline" className="text-xs">Edited</Badge>}
          </div>

          <Card className={`p-3 ${isOwnMessage ? 'bg-primary text-primary-foreground' : ''}`}>
            <div className="text-sm whitespace-pre-wrap break-words">
              {message.content.split(/(@\[[^\]]+\]\([^)]+\))/).map((part, idx) => {
                const mentionMatch = part.match(/@\[([^\]]+)\]\([^)]+\)/);
                if (mentionMatch) {
                  return (
                    <Badge 
                      key={idx} 
                      variant={isOwnMessage ? 'secondary' : 'default'}
                      className="text-xs mx-0.5"
                    >
                      @{mentionMatch[1]}
                    </Badge>
                  );
                }
                return <span key={idx}>{part}</span>;
              })}
            </div>

            {attachmentIds.length > 0 && (
              <div className="mt-3">
                {mediaLoading ? (
                  <div className="grid grid-cols-2 gap-2">
                    {attachmentIds.map((_: any, idx: number) => (
                      <Skeleton key={idx} className="aspect-square rounded-lg" />
                    ))}
                  </div>
                ) : mediaItems.length > 0 ? (
                  <div className={`grid gap-2 ${
                    mediaItems.length === 1 ? 'grid-cols-1' :
                    mediaItems.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'
                  }`}>
                    {mediaItems.map((item, idx) => {
                      const isVideo = item.file_type === 'video';
                      const isProcessing = item.upload_status === 'processing';

                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setViewerIndex(idx);
                            setViewerOpen(true);
                          }}
                          className="relative group rounded-lg overflow-hidden border hover:ring-2 hover:ring-primary transition-all"
                        >
                          <div className="aspect-square relative">
                            <img
                              src={item.thumbnail_url || item.public_url}
                              alt={item.original_filename}
                              className="w-full h-full object-cover"
                            />
                            {isVideo && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                <Video className="h-8 w-8 text-white drop-shadow-lg" />
                              </div>
                            )}
                            {isProcessing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                <div className="flex flex-col items-center">
                                  <Loader2 className="h-6 w-6 text-white animate-spin mb-1" />
                                  <span className="text-xs text-white">Processing...</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </div>

      <MediaViewer
        media={mediaItems}
        initialIndex={viewerIndex}
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
      />
    </>
  );
}
