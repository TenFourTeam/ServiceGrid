import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, AtSign } from 'lucide-react';
import { toast } from 'sonner';
import { MentionPicker } from './MentionPicker';
import { Badge } from '@/components/ui/badge';

interface MessageComposerProps {
  onSend: (content: string, attachments?: any[]) => void;
}

export function MessageComposer({ onSend }: MessageComposerProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;

    onSend(content, attachments);
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
    toast.info('Attachment picker coming soon');
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