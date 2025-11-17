import { useState, useRef, KeyboardEvent, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, StopCircle, Camera, X } from 'lucide-react';
import { toast } from 'sonner';

interface ChatInputProps {
  onSend: (message: string, attachments?: File[]) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  placeholder?: string;
  suggestions?: string[];
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  placeholder = 'Ask me anything...',
  suggestions = []
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((!message.trim() && attachments.length === 0) || isStreaming) return;
    onSend(message, attachments);
    setMessage('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    // Auto-resize
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 150) + 'px';
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (!isStreaming) {
      onSend(suggestion);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/'));
    
    if (imageFiles.length !== files.length) {
      toast.error('Only image files are supported for AI chat');
    }
    
    setAttachments(prev => [...prev, ...imageFiles]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-border bg-background p-4">
      {/* Quick Suggestions */}
      {suggestions.length > 0 && !isStreaming && !message && attachments.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((suggestion, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}

      {/* Image Previews */}
      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-12 h-12 md:w-16 md:h-16 object-cover rounded-lg border border-border"
                />
                <button
                  onClick={() => removeAttachment(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            {attachments.length} image{attachments.length > 1 ? 's' : ''} attached
          </p>
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2 items-end">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => fileInputRef.current?.click()}
                size="icon"
                variant="ghost"
                className="flex-shrink-0"
                disabled={isStreaming}
              >
                <Camera className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Take a photo to get instant AI guidance</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isStreaming}
          className="min-h-[44px] max-h-[150px] resize-none"
          rows={1}
        />
        
        {isStreaming ? (
          <Button
            onClick={onStop}
            size="icon"
            variant="destructive"
            className="flex-shrink-0"
          >
            <StopCircle className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSend}
            disabled={!message.trim() && attachments.length === 0}
            size="icon"
            className="flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground mt-2">
        Press Enter to send, Shift+Enter for new line{attachments.length > 0 && ` • ${attachments.length} image${attachments.length > 1 ? 's' : ''} attached`}
      </p>
    </div>
  );
}
