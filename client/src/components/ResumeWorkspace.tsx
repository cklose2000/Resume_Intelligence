import React, { useState, useEffect, useCallback } from 'react';
import { ResumeEditor } from './ResumeEditor';
import { ResumePreview } from './ResumePreview';
import { AISuggestions } from './AISuggestions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { DocumentStructureParser, ResumeStructure, EditOperation } from '@/lib/documentStructure';
import { 
  FileText, 
  Eye, 
  Brain, 
  Maximize2, 
  Minimize2, 
  Download,
  Upload,
  Save
} from 'lucide-react';

interface ResumeWorkspaceProps {
  initialContent: string;
  optimizedContent?: string;
  aiSuggestions?: any[];
  onContentChange?: (content: string) => void;
  onExport?: (format: 'docx' | 'pdf' | 'txt') => void;
  className?: string;
}

export function ResumeWorkspace({
  initialContent,
  optimizedContent,
  aiSuggestions = [],
  onContentChange,
  onExport,
  className
}: ResumeWorkspaceProps) {
  const [content, setContent] = useState(initialContent);
  const [activeView, setActiveView] = useState<'editor' | 'preview' | 'split'>('split');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [structure, setStructure] = useState<ResumeStructure | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Parse document structure on content change
  useEffect(() => {
    const parser = new DocumentStructureParser(content);
    const parsed = parser.parse();
    setStructure(parsed);
  }, [content]);

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    setHasUnsavedChanges(true);
    onContentChange?.(newContent);
  }, [onContentChange]);

  const handleApplyEdit = useCallback((operation: EditOperation) => {
    if (!structure) return;
    
    const parser = new DocumentStructureParser(content);
    const updatedStructure = parser.applyStructuredEdits(structure, operation);
    const newContent = parser.toHTML(updatedStructure);
    
    handleContentChange(newContent);
  }, [structure, content, handleContentChange]);

  const handleSave = useCallback(() => {
    // Save to local storage or trigger save callback
    localStorage.setItem('resume-draft', content);
    setHasUnsavedChanges(false);
  }, [content]);

  const handleExport = useCallback((format: 'docx' | 'pdf' | 'txt') => {
    onExport?.(format);
  }, [onExport]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (hasUnsavedChanges) {
      const timer = setTimeout(() => {
        handleSave();
      }, 30000); // Auto-save after 30 seconds

      return () => clearTimeout(timer);
    }
  }, [hasUnsavedChanges, handleSave]);

  const renderContent = () => {
    if (activeView === 'editor') {
      return (
        <div className="h-full">
          <ResumeEditor
            content={content}
            onChange={handleContentChange}
            aiSuggestions={aiSuggestions}
            className="h-full"
          />
        </div>
      );
    }

    if (activeView === 'preview') {
      return (
        <div className="h-full">
          <ResumePreview
            content={content}
            className="h-full"
          />
        </div>
      );
    }

    // Split view
    return (
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full border-r">
            <div className="px-4 py-2 border-b bg-gray-50">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Editor
              </h3>
            </div>
            <ResumeEditor
              content={content}
              onChange={handleContentChange}
              aiSuggestions={aiSuggestions}
              className="h-[calc(100%-48px)]"
            />
          </div>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize={50} minSize={30}>
          <div className="h-full">
            <div className="px-4 py-2 border-b bg-gray-50">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Live Preview
              </h3>
            </div>
            <ResumePreview
              content={content}
              className="h-[calc(100%-48px)]"
            />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  };

  return (
    <div className={cn("resume-workspace flex flex-col h-screen bg-gray-50", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b">
        <div className="flex items-center gap-2">
          <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)}>
            <TabsList>
              <TabsTrigger value="editor">Editor</TabsTrigger>
              <TabsTrigger value="split">Split View</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            Save Draft
          </Button>

          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('docx')}
              title="Export as DOCX"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              title="Export as PDF"
            >
              <FileText className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="gap-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant={showSuggestions ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSuggestions(!showSuggestions)}
            className="gap-2"
          >
            <Brain className="h-4 w-4" />
            AI Suggestions
          </Button>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showSuggestions ? (
          <ResizablePanelGroup direction="vertical" className="h-full">
            <ResizablePanel defaultSize={70} minSize={50}>
              {renderContent()}
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={20}>
              <AISuggestions
                suggestions={aiSuggestions}
                onApplySuggestion={(suggestion) => {
                  // Convert suggestion to EditOperation
                  const operation: EditOperation = {
                    edits: [{
                      section: suggestion.section as any,
                      index: suggestion.index,
                      field: suggestion.field,
                      original: suggestion.original || '',
                      suggested: suggestion.suggested,
                      reason: suggestion.reason
                    }],
                    additions: [],
                    removals: []
                  };
                  handleApplyEdit(operation);
                }}
                className="h-full"
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="h-full">
            {renderContent()}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .resume-workspace {
          font-family: system-ui, -apple-system, sans-serif;
        }
        
        .resume-workspace .resizable-handle {
          background-color: #e5e7eb;
          transition: background-color 0.2s;
        }
        
        .resume-workspace .resizable-handle:hover {
          background-color: #d1d5db;
        }
        
        .resume-workspace .resizable-handle[data-orientation="horizontal"] {
          width: 3px;
          cursor: col-resize;
        }
        
        .resume-workspace .resizable-handle[data-orientation="vertical"] {
          height: 3px;
          cursor: row-resize;
        }
      ` }} />
    </div>
  );
}