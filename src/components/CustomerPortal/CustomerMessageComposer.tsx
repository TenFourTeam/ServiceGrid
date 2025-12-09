import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, Paperclip, X, FileText, Play } from 'lucide-react';
import { useCustomerMediaUpload } from '@/hooks/useCustomerMediaUpload';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'video' | 'file';
  name: string;
  thumbnailUrl?: string;
  isUploading?: boolean;
  progress?: number;
}

interface CustomerMessageComposerProps {
  conversationId?: string;
  onSend: (content: string, attachmentIds?: string[]) => void;
  isSending: boolean;
  placeholder?: string;
}

export function CustomerMessageComposer({ 
  conversationId,
  onSend, 
  isSending, 
  placeholder = 'Type your message...' 
}: CustomerMessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadMedia, uploading } = useCustomerMediaUpload();

  const isUploadingAny = attachments.some(a => a.isUploading);
  const canSend = (content.trim() || attachments.length > 0) && !isSending && !isUploadingAny;

  const handleSubmit = () => {
    if (!canSend) return;
    
    const attachmentIds = attachments.map(a => a.id);
    onSend(content.trim(), attachmentIds.length > 0 ? attachmentIds : undefined);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      
      // Add temporary attachment with uploading state
      const tempAttachment: Attachment = {
        id: tempId,
        url: URL.createObjectURL(file),
        type: isImage ? 'image' : isVideo ? 'video' : 'file',
        name: file.name,
        isUploading: true,
        progress: 0
      };
      
      setAttachments(prev => [...prev, tempAttachment]);

      try {
        const result = await uploadMedia(file, {
          conversationId: conversationId || null,
          onProgress: (progress) => {
            setAttachments(prev => 
              prev.map(a => a.id === tempId ? { ...a, progress } : a)
            );
          }
        });

        // Replace temp attachment with real one
        setAttachments(prev => 
          prev.map(a => a.id === tempId ? {
            id: result.mediaId,
            url: result.url,
            type: result.mimeType?.startsWith('video/') ? 'video' : 
                  result.mimeType?.startsWith('image/') ? 'image' : 'file',
            name: file.name,
            thumbnailUrl: result.thumbnailUrl,
            isUploading: false
          } : a)
        );
      } catch (error) {
        console.error('Upload failed:', error);
        // Remove failed attachment
        setAttachments(prev => prev.filter(a => a.id !== tempId));
      }
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const renderAttachmentPreview = (attachment: Attachment) => {
    return (
      <div key={attachment.id} className="relative group">
        <div className={cn(
          "relative w-16 h-16 rounded-lg overflow-hidden border bg-muted",
          attachment.isUploading && "opacity-60"
        )}>
          {attachment.type === 'image' ? (
            <img 
              src={attachment.thumbnailUrl || attachment.url} 
              alt={attachment.name}
              className="w-full h-full object-cover"
            />
          ) : attachment.type === 'video' ? (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play className="h-6 w-6 text-muted-foreground" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          )}
          
          {attachment.isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50">
              <Progress value={attachment.progress} className="w-10 h-1" />
            </div>
          )}
        </div>
        
        {!attachment.isUploading && (
          <button
            onClick={() => removeAttachment(attachment.id)}
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="border-t bg-background">
      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 flex-wrap">
          {attachments.map(renderAttachmentPreview)}
        </div>
      )}
      
      <div className="flex gap-2 p-4 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSending || uploading}
          className="shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isSending}
          className="min-h-[44px] max-h-32 resize-none"
          rows={1}
        />
        
        <Button
          onClick={handleSubmit}
          disabled={!canSend}
          size="icon"
          className="shrink-0"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
