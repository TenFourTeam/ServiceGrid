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
import { ReferenceCard } from './ReferenceCard';

interface MessageBubbleProps {
  message: {
    id: string;
    content: string;
    created_at: string;
    edited: boolean;
    sender_id: string;
    sender_type?: 'user' | 'customer';
    customer_name?: string;
    sender?: {
      id: string;
      full_name: string;
    };
    attachments?: any[];
  };
  isGrouped?: boolean;
  onEntityClick?: (type: 'job' | 'quote' | 'invoice', id: string) => void;
}

// Parse entity references like /job[Title](id)
const REFERENCE_PATTERN = /\/(job|quote|invoice)\[([^\]]+)\]\(([^)]+)\)/g;

function parseReferences(content: string): Array<{ type: 'job' | 'quote' | 'invoice'; title: string; id: string }> {
  const refs: Array<{ type: 'job' | 'quote' | 'invoice'; title: string; id: string }> = [];
  let match;
  const regex = new RegExp(REFERENCE_PATTERN.source, 'g');
  while ((match = regex.exec(content)) !== null) {
    refs.push({ type: match[1] as 'job' | 'quote' | 'invoice', title: match[2], id: match[3] });
  }
  return refs;
}

function removeReferencesFromContent(content: string): string {
  return content.replace(REFERENCE_PATTERN, '').trim();
}

export function MessageBubble({ message, isGrouped = false, onEntityClick }: MessageBubbleProps) {
  const { userId } = useBusinessContext();
  const isCustomerMessage = message.sender_type === 'customer';
  const isOwnMessage = !isCustomerMessage && message.sender_id === userId;
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const attachmentIds = message.attachments ? 
    (typeof message.attachments === 'string' ? JSON.parse(message.attachments) : message.attachments) 
    : [];

  const { data: mediaItems = [], isLoading: mediaLoading } = useConversationMedia(
    attachmentIds.length > 0 ? attachmentIds : undefined
  );

  // Parse references from message content
  const references = parseReferences(message.content || '');
  const textContent = removeReferencesFromContent(message.content || '');

  // For customer messages, use customer_name; for team messages, use sender.full_name
  const senderName = isCustomerMessage 
    ? message.customer_name || 'Customer' 
    : message.sender?.full_name || 'Unknown';

  return (
    <>
      <div className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
        <Avatar className={`h-8 w-8 flex-shrink-0 ${isGrouped ? 'invisible' : ''}`}>
          <AvatarFallback className="text-xs">
            {senderName.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className={`flex flex-col gap-1 max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {!isGrouped && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium">{senderName}</span>
              {isCustomerMessage && (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                  Customer
                </Badge>
              )}
              <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}</span>
              {message.edited && <Badge variant="outline" className="text-xs">Edited</Badge>}
            </div>
          )}

          <Card className={`p-3 ${isOwnMessage ? 'bg-primary text-primary-foreground' : ''}`}>
            {/* Text content with mentions */}
            {textContent && (
              <div className="text-sm whitespace-pre-wrap break-words">
                {textContent.split(/(@\[[^\]]+\]\([^)]+\))/).map((part, idx) => {
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
            )}

            {/* Entity references */}
            {references.length > 0 && (
              <div className={`flex flex-wrap gap-2 ${textContent ? 'mt-2' : ''}`}>
                {references.map((ref, idx) => (
                  <ReferenceCard
                    key={idx}
                    type={ref.type}
                    title={ref.title}
                    compact
                    onClick={() => onEntityClick?.(ref.type, ref.id)}
                  />
                ))}
              </div>
            )}

            {/* Attachments */}
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
                            if (mediaItems.length > 0) {
                              setViewerIndex(idx);
                              setViewerOpen(true);
                            }
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

      {viewerOpen && mediaItems.length > 0 && (
        <MediaViewer
          media={mediaItems}
          initialIndex={viewerIndex}
          isOpen={viewerOpen}
          onClose={() => setViewerOpen(false)}
        />
      )}
    </>
  );
}