import React, { useRef, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import * as Diff from 'diff';

interface TextSegment {
  id: string;
  text: string;
  isAiSuggestion: boolean;
  isEdited: boolean;
}

interface InteractiveResumeEditorProps {
  originalContent: string;
  optimizedContent: string | null;
  onContentChange: (content: string) => void;
  className?: string;
}

export function InteractiveResumeEditor({
  originalContent,
  optimizedContent,
  onContentChange,
  className
}: InteractiveResumeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [segments, setSegments] = useState<TextSegment[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Parse content into segments with AI suggestions highlighted
  useEffect(() => {
    if (!optimizedContent) {
      // No optimization yet, show original content as single segment
      setSegments([{
        id: '0',
        text: originalContent,
        isAiSuggestion: false,
        isEdited: false
      }]);
      return;
    }

    // Use diff library to compare original and optimized content
    const parseContentIntoSegments = () => {
      // Get word-by-word diff for more granular highlighting
      const diffParts = Diff.diffWords(originalContent, optimizedContent);
      const newSegments: TextSegment[] = [];
      let segmentId = 0;
      
      diffParts.forEach((part) => {
        if (part.removed) {
          // Skip removed parts - we don't show them
          return;
        }
        
        const text = part.value;
        const isAiSuggestion = part.added || false;
        
        // Split by newlines to maintain structure
        const lines = text.split('\n');
        
        lines.forEach((line, lineIndex) => {
          // Don't create segments for empty lines between splits
          if (lineIndex > 0 && lineIndex < lines.length - 1 && !line.trim()) {
            newSegments.push({
              id: `seg-${segmentId++}`,
              text: '\n',
              isAiSuggestion: false,
              isEdited: false
            });
          } else if (line) {
            newSegments.push({
              id: `seg-${segmentId++}`,
              text: line + (lineIndex < lines.length - 1 ? '\n' : ''),
              isAiSuggestion,
              isEdited: false
            });
          }
        });
      });
      
      setSegments(newSegments);
    };

    parseContentIntoSegments();
  }, [originalContent, optimizedContent]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const content = history[newIndex];
      updateEditorContent(content);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const content = history[newIndex];
      updateEditorContent(content);
    }
  };

  const updateEditorContent = (content: string) => {
    if (editorRef.current) {
      editorRef.current.innerHTML = formatContentForDisplay(content);
      onContentChange(content);
    }
  };

  const formatContentForDisplay = (content: string) => {
    // If we have segments from diff, use them
    if (segments.length > 0 && optimizedContent) {
      let html = '';
      let currentParagraph = '';
      
      segments.forEach((segment, index) => {
        const text = segment.text;
        
        // Handle newlines to create proper structure
        if (text === '\n' || text.endsWith('\n\n')) {
          if (currentParagraph) {
            html += currentParagraph;
            currentParagraph = '';
          }
          if (text === '\n\n' || text.endsWith('\n\n')) {
            html += '<div class="resume-paragraph-break"></div>';
          }
          return;
        }
        
        const trimmedText = text.replace(/\n$/, '').trim();
        if (!trimmedText) return;
        
        // Determine the type of content
        let elementClass = 'resume-content';
        let elementTag = 'div';
        
        // Check if it's a section header
        if (/^[A-Z\s&-]{5,}$/.test(trimmedText) || 
            /^(PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS|SUMMARY|OBJECTIVE|CONTACT)$/i.test(trimmedText)) {
          elementClass = 'resume-section-header';
        }
        // Check if it's a job title or date
        else if (/^[A-Z][A-Za-z\s]+(–|—|\s-\s)[A-Z]/.test(trimmedText) || 
                 /^\d{4}[\s-]+\d{4}/.test(trimmedText) ||
                 /^\d{4}\s*-\s*Present/i.test(trimmedText)) {
          elementClass = 'resume-subtitle';
        }
        // Check if it's a bullet point
        else if (trimmedText.startsWith('•') || trimmedText.startsWith('-') || trimmedText.startsWith('*')) {
          elementClass = 'resume-bullet';
        }
        
        // Add AI suggestion class if applicable
        const aiClass = segment.isAiSuggestion ? ' ai-suggestion' : '';
        
        const element = `<${elementTag} class="${elementClass}${aiClass}" data-segment-id="${segment.id}">${trimmedText}</${elementTag}>`;
        
        if (text.endsWith('\n') && !text.endsWith('\n\n')) {
          html += element;
        } else {
          currentParagraph += element;
        }
      });
      
      // Add any remaining content
      if (currentParagraph) {
        html += currentParagraph;
      }
      
      return html;
    }
    
    // Fallback to basic formatting if no segments
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return '<div class="resume-paragraph-break"></div>';
      
      let className = 'resume-content';
      if (/^[A-Z\s&-]{5,}$/.test(trimmedLine)) {
        className = 'resume-section-header';
      } else if (/\d{4}/.test(trimmedLine)) {
        className = 'resume-subtitle';
      }
      
      return `<div class="${className}" data-line="${index}">${trimmedLine}</div>`;
    }).join('');
  };

  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const content = extractTextFromHTML(e.currentTarget.innerHTML);
    
    // Update history for undo/redo
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
    
    onContentChange(content);
  }, [history, historyIndex, onContentChange]);

  const extractTextFromHTML = (html: string): string => {
    // Create a temporary div to extract text content
    const temp = document.createElement('div');
    temp.innerHTML = html;
    
    // Process each element to maintain structure
    const processNode = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const children = Array.from(element.childNodes)
          .map(child => processNode(child))
          .join('');
        
        // Add line breaks based on element type
        if (element.classList.contains('resume-section-header') ||
            element.classList.contains('resume-subtitle') ||
            element.classList.contains('resume-content')) {
          return children + '\n';
        }
        
        if (element.classList.contains('resume-paragraph-break')) {
          return '\n';
        }
        
        return children;
      }
      
      return '';
    };
    
    return processNode(temp).trim();
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  return (
    <div className={cn("interactive-resume-editor", className)}>
      <style jsx>{`
        .interactive-resume-editor {
          position: relative;
        }
        
        .editor-content {
          min-height: 400px;
          padding: 1rem;
          outline: none;
          font-family: system-ui, -apple-system, sans-serif;
          line-height: 1.6;
          color: #1f2937;
        }
        
        .editor-content:focus {
          background-color: #fafafa;
        }
        
        .resume-section-header {
          font-weight: 700;
          font-size: 1.125rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.25rem;
          border-bottom: 1px solid #e5e7eb;
          color: #111827;
        }
        
        .resume-subtitle {
          font-weight: 600;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
          color: #374151;
        }
        
        .resume-content {
          margin-bottom: 0.5rem;
          color: #4b5563;
        }
        
        .resume-bullet {
          margin-bottom: 0.5rem;
          color: #4b5563;
          padding-left: 1.5rem;
        }
        
        .resume-paragraph-break {
          height: 1rem;
        }
        
        .ai-suggestion {
          background-color: #dcfce7;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
          border-left: 3px solid #22c55e;
          margin-left: -3px;
          padding-left: 0.5rem;
          transition: background-color 0.2s;
        }
        
        .ai-suggestion:hover {
          background-color: #bbf7d0;
        }
        
        .editor-toolbar {
          position: sticky;
          top: 0;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          padding: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          z-index: 10;
        }
        
        .toolbar-button {
          padding: 0.25rem 0.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.25rem;
          background: white;
          cursor: pointer;
          font-size: 0.875rem;
          color: #4b5563;
          transition: all 0.2s;
        }
        
        .toolbar-button:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
        
        .toolbar-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .edit-indicator {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          font-size: 0.75rem;
          color: #10b981;
          background: #ecfdf5;
          padding: 0.25rem 0.5rem;
          border-radius: 0.25rem;
          opacity: 0;
          transition: opacity 0.2s;
        }
        
        .editing .edit-indicator {
          opacity: 1;
        }
      `}</style>
      
      <div className={cn("relative", isEditing && "editing")}>
        <div className="editor-toolbar">
          <button 
            className="toolbar-button"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo (Ctrl+Z)"
          >
            ↶ Undo
          </button>
          <button 
            className="toolbar-button"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            ↷ Redo
          </button>
          <div className="flex-1"></div>
          <div className="text-sm text-gray-500">
            Click any text to edit • Green highlights show AI suggestions
          </div>
        </div>
        
        <div
          ref={editorRef}
          contentEditable
          className="editor-content"
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          dangerouslySetInnerHTML={{ 
            __html: formatContentForDisplay(optimizedContent || originalContent) 
          }}
        />
        
        <div className="edit-indicator">
          Editing...
        </div>
      </div>
    </div>
  );
}