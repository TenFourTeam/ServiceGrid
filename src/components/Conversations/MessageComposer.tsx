import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, AtSign, X, Loader2, Image as ImageIcon, Video } from 'lucide-react';
import { toast } from 'sonner';
import { MentionPicker } from './MentionPicker';
import { Badge } from '@/components/ui/badge';
import { useConversationMediaUpload } from '@/hooks/useConversationMediaUpload';
import { createOptimisticMediaItem, MediaItem } from '@/hooks/useJobMedia';
import { Progress } from '@/components/ui/progress';

interface MessageComposerProps {
  conversationId: string;
  onSend: (content: string, attachments?: string[]) => void;
}

export function MessageComposer({ conversationId, onSend }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MediaItem[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, number>>(new Map());
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia } = useConversationMediaUpload();

  const handleSend = async () => {
    if (!content.trim() && attachments.length === 0) return;
    if (uploadingFiles.size > 0) {
      toast.error('Please wait for uploads to complete');
      return;
    }

    // Get media IDs from attachments (filter out optimistic items)
    const mediaIds = attachments
      .filter(item => !item.isOptimistic)
      .map(item => item.id);

    onSend(content, mediaIds);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Don't handle Enter if mention picker is open - let picker handle it
    if (showMentionPicker && ['ArrowDown', 'ArrowUp', 'Enter', 'Escape'].includes(e.key)) {
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    setContent(newContent);
    setCursorPosition(newCursorPos);

    // Check for @ mentions
    const textBeforeCursor = newContent.slice(0, newCursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Only show picker if @ is followed by word characters (no spaces)
      if (!/\s/.test(textAfterAt)) {
        setMentionStartPos(lastAtIndex);
        setMentionQuery(textAfterAt);
        setShowMentionPicker(true);
        
        // Calculate anchor position for picker
        if (textareaRef.current) {
          const rect = textareaRef.current.getBoundingClientRect();
          setAnchorRect(rect);
        }
      } else {
        setShowMentionPicker(false);
      }
    } else {
      setShowMentionPicker(false);
    }
  };

  const handleMentionSelect = (userId: string, displayName: string) => {
    if (mentionStartPos === -1) return;

    // Replace @query with formatted mention: @[Display Name](user-id)
    const beforeMention = content.slice(0, mentionStartPos);
    const afterMention = content.slice(cursorPosition);
    const mention = `@[${displayName}](${userId})`;
    const newContent = beforeMention + mention + ' ' + afterMention;

    setContent(newContent);
    setShowMentionPicker(false);
    setMentionStartPos(-1);
    setMentionQuery('');

    // Focus back on textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + mention.length + 1;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  const handleAttachment = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate file types
    const validTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml',
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'
    ];

    const invalidFiles = files.filter(f => !validTypes.includes(f.type));
    if (invalidFiles.length > 0) {
      toast.error(`Unsupported file types: ${invalidFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Validate file sizes (100MB max)
    const oversizedFiles = files.filter(f => f.size > 100 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast.error(`Files too large (max 100MB): ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    // Create optimistic items
    const optimisticItems = files.map(file => createOptimisticMediaItem(file));
    setAttachments(prev => [...prev, ...optimisticItems]);

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const optimisticItem = optimisticItems[i];

      try {
        setUploadingFiles(prev => new Map(prev).set(optimisticItem.id, 0));

        const result = await uploadMedia(file, {
          conversationId,
          onProgress: (progress) => {
            setUploadingFiles(prev => {
              const next = new Map(prev);
              next.set(optimisticItem.id, progress);
              return next;
            });
          }
        });

        // Replace optimistic item with real data
        setAttachments(prev => prev.map(item => 
          item.id === optimisticItem.id
            ? {
                ...item,
                id: result.mediaId,
                public_url: result.url,
                thumbnail_url: result.thumbnailUrl || result.url,
                isOptimistic: false,
                upload_status: 'completed' as const
              }
            : item
        ));

        setUploadingFiles(prev => {
          const next = new Map(prev);
          next.delete(optimisticItem.id);
          return next;
        });

        toast.success(result.isDuplicate ? 'File already uploaded' : 'File uploaded');
      } catch (error) {
        console.error('Upload failed:', error);
        toast.error(`Failed to upload ${file.name}`);
        
        // Remove failed item
        setAttachments(prev => prev.filter(item => item.id !== optimisticItem.id));
        setUploadingFiles(prev => {
          const next = new Map(prev);
          next.delete(optimisticItem.id);
          return next;
        });
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (itemId: string) => {
    setAttachments(prev => prev.filter(item => item.id !== itemId));
    setUploadingFiles(prev => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
  };

  const insertMention = () => {
    if (textareaRef.current) {
      const cursorPos = textareaRef.current.selectionStart;
      const newContent = content.slice(0, cursorPos) + '@' + content.slice(cursorPos);
      setContent(newContent);
      setCursorPosition(cursorPos + 1);
      
      // Trigger mention picker
      const rect = textareaRef.current.getBoundingClientRect();
      setAnchorRect(rect);
      setMentionStartPos(cursorPos);
      setMentionQuery('');
      setShowMentionPicker(true);
      
      // Focus and set cursor after @
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(cursorPos + 1, cursorPos + 1);
        }
      }, 0);
    }
  };

  // Extract mentions from content for visual display
  const mentions = content.match(/@\[([^\]]+)\]\([^)]+\)/g) || [];

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      
      <div className="relative">
        <Textarea
          ref={textareaRef}
          placeholder="Type a message... (@ to mention, Shift+Enter for new line)"
          value={content}
          onChange={handleContentChange}
          onKeyDown={handleKeyDown}
          className="min-h-[80px] resize-none"
        />
        <MentionPicker
          isOpen={showMentionPicker}
          onClose={() => {
            setShowMentionPicker(false);
            setMentionStartPos(-1);
          }}
          onSelect={handleMentionSelect}
          searchQuery={mentionQuery}
          anchorRect={anchorRect}
        />
      </div>
      
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mentions.map((mention, idx) => {
            const displayName = mention.match(/@\[([^\]]+)\]/)?.[1] || 'Unknown';
            return (
              <Badge key={idx} variant="secondary" className="text-xs">
                @{displayName}
              </Badge>
            );
          })}
        </div>
      )}

      {/* Attachment Previews */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {attachments.map((item) => {
            const isUploading = uploadingFiles.has(item.id);
            const progress = uploadingFiles.get(item.id) || 0;
            const isVideo = item.file_type === 'video';

            return (
              <div key={item.id} className="relative group rounded-lg overflow-hidden border">
                <div className="aspect-square relative">
                  <img
                    src={item.thumbnail_url || item.public_url}
                    alt={item.original_filename}
                    className="w-full h-full object-cover"
                  />
                  {isVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Video className="h-8 w-8 text-white" />
                    </div>
                  )}
                  {isUploading && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
                      <Loader2 className="h-6 w-6 text-white animate-spin mb-2" />
                      <Progress value={progress} className="w-16 h-1" />
                    </div>
                  )}
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemoveAttachment(item.id)}
                    disabled={isUploading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleAttachment}
            disabled={uploadingFiles.size > 0}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertMention}>
            <AtSign className="h-4 w-4" />
          </Button>
        </div>
        <Button 
          onClick={handleSend} 
          size="sm" 
          disabled={!content.trim() && attachments.length === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  );
}