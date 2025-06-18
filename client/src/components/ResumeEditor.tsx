import React, { useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Heading from '@tiptap/extension-heading';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Underline from '@tiptap/extension-underline';
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import ListItem from '@tiptap/extension-list-item';
import History from '@tiptap/extension-history';
import TextAlign from '@tiptap/extension-text-align';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Bold as BoldIcon, 
  Italic as ItalicIcon, 
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Heading1,
  Heading2,
  Heading3,
  Type
} from 'lucide-react';

interface ResumeEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
  editable?: boolean;
  aiSuggestions?: {
    start: number;
    end: number;
    suggestion: string;
    reason: string;
  }[];
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="border-b p-2 flex flex-wrap gap-1 bg-white sticky top-0 z-10">
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={editor.isActive('paragraph') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setParagraph().run()}
          className="h-8 px-2"
        >
          <Type className="h-4 w-4 mr-1" />
          Normal
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('heading', { level: 3 }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 w-8 p-0"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-8 bg-gray-300 mx-1" />

      <div className="flex gap-1">
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className="h-8 w-8 p-0"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className="h-8 w-8 p-0"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className="h-8 w-8 p-0"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          className="h-8 w-8 p-0"
        >
          <AlignJustify className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export function ResumeEditor({
  content,
  onChange,
  className,
  editable = true,
  aiSuggestions = []
}: ResumeEditorProps) {
  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      StarterKit.configure({
        document: false,
        paragraph: false,
        history: false,
      }),
      Heading.configure({
        levels: [1, 2, 3],
      }),
      Bold,
      Italic,
      Underline,
      BulletList,
      OrderedList,
      ListItem,
      History,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  const highlightAISuggestions = useCallback(() => {
    if (!editor || aiSuggestions.length === 0) return;

    // Apply custom decorations for AI suggestions
    aiSuggestions.forEach(({ start, end }) => {
      // This would require implementing a custom ProseMirror plugin
      // For now, we'll handle it through CSS classes
    });
  }, [editor, aiSuggestions]);

  useEffect(() => {
    highlightAISuggestions();
  }, [highlightAISuggestions]);

  return (
    <div className={cn("resume-editor border rounded-lg overflow-hidden bg-white", className)}>
      {editable && <MenuBar editor={editor} />}
      <EditorContent 
        editor={editor} 
        className="prose prose-sm max-w-none p-4 min-h-[400px] focus:outline-none"
        style={{
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      />
      <style dangerouslySetInnerHTML={{ __html: `
        .ProseMirror {
          min-height: 400px;
          outline: none;
        }
        
        .ProseMirror h1 {
          font-size: 1.5rem;
          font-weight: 700;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 0.25rem;
        }
        
        .ProseMirror h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin-top: 1.25rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror h3 {
          font-size: 1.125rem;
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }
        
        .ProseMirror p {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
        
        .ProseMirror ul,
        .ProseMirror ol {
          margin-bottom: 0.75rem;
          padding-left: 1.5rem;
        }
        
        .ProseMirror li {
          margin-bottom: 0.25rem;
        }
        
        .ProseMirror strong {
          font-weight: 600;
        }
        
        .ProseMirror em {
          font-style: italic;
        }
        
        .ProseMirror u {
          text-decoration: underline;
        }
        
        .ai-suggestion {
          background-color: #dcfce7;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          border-left: 3px solid #22c55e;
          margin-left: -3px;
          padding-left: 0.5rem;
        }
        
        .ai-suggestion:hover {
          background-color: #bbf7d0;
        }
      ` }} />
    </div>
  );
}