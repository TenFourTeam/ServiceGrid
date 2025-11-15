import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Image } from '@tiptap/extension-image';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Undo, Redo, Table as TableIcon, CheckSquare
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface TiptapEditorProps {
  content: any;
  onChange: (json: any) => void;
  onCursorChange?: (position: any) => void;
  editable?: boolean;
  placeholder?: string;
}

export function TiptapEditor({ 
  content, 
  onChange, 
  onCursorChange,
  editable = true,
  placeholder = 'Start typing...'
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Color,
      TextStyle,
      Highlight.configure({
        multicolor: true,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      onCursorChange?.({ from, to });
    },
  });

  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editable, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {editable && (
        <div className="border-b bg-muted/50 p-2 flex flex-wrap gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-muted' : ''}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={editor.isActive('code') ? 'bg-muted' : ''}
          >
            <Code className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-muted' : ''}
          >
            <Heading1 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-muted' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive('heading', { level: 3 }) ? 'bg-muted' : ''}
          >
            <Heading3 className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={editor.isActive('taskList') ? 'bg-muted' : ''}
          >
            <CheckSquare className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-muted' : ''}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
          >
            <TableIcon className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-8" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      )}

      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
      />
    </div>
  );
}