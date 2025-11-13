import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, AtSign } from 'lucide-react';
import { toast } from 'sonner';

interface MessageComposerProps {
  onSend: (content: string, attachments?: any[]) => void;
}

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSend(content, attachments);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAttachment = () => {
    toast.info('Attachment picker coming soon');
  };

  const insertMention = () => {
    toast.info('Mention picker coming soon');
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={textareaRef}
        placeholder="Type a message... (Shift+Enter for new line)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[80px] resize-none"
      />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleAttachment}>
            <Paperclip className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={insertMention}>
            <AtSign className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleSend} size="sm" disabled={!content.trim()}>
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </div>
    </div>
  );
}