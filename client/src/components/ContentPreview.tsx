import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Download, Edit3, Eye, Save, Clock } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { generateDocument, getTemplates, type DocumentTemplate } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import * as Diff from 'diff';
import { InteractiveResumeEditor } from './InteractiveResumeEditor';

interface ContentPreviewProps {
  originalContent: string;
  optimizedContent: string | null;
  appliedRecommendations: string[];
  isOptimizing: boolean;
}

export function ContentPreview({ 
  originalContent, 
  optimizedContent, 
  appliedRecommendations,
  isOptimizing 
}: ContentPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [useInteractiveEditor, setUseInteractiveEditor] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState('Modern Professional');
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const { toast } = useToast();

  // Update edited content when optimized content changes
  useEffect(() => {
    const contentToShow = optimizedContent || originalContent;
    setEditedContent(contentToShow);
  }, [optimizedContent, originalContent]);

  // Load templates on mount
  useEffect(() => {
    getTemplates().then(data => setTemplates(data.templates));
  }, []);

  const generateDocumentMutation = useMutation({
    mutationFn: (data: { content: string; template: string; format: string }) =>
      generateDocument(data.content, data.template, data.format),
    onSuccess: (data) => {
      // Convert base64 content to blob for download
      const binaryString = atob(data.content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: data.format === 'pdf' ? 'application/pdf' : 
              data.format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
              'text/plain'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Document Generated",
        description: `Downloaded ${data.filename} successfully.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Failed to generate document",
        variant: "destructive",
      });
    },
  });

  const handleDownload = (format: string) => {
    const contentToDownload = editedContent || optimizedContent || originalContent;
    generateDocumentMutation.mutate({
      content: contentToDownload,
      template: selectedTemplate,
      format
    });
  };

  const handleSaveEdit = () => {
    setIsEditing(false);
    toast({
      title: "Changes Saved",
      description: "Your edits have been saved to the preview.",
    });
  };

  const contentToShow = editedContent || optimizedContent || originalContent;
  const hasOptimizations = optimizedContent !== null;
  const hasAppliedRecommendations = appliedRecommendations.length > 0;

  // Calculate diff to highlight changes
  const diffParts = useMemo(() => {
    if (!optimizedContent || isEditing) return null;
    
    // Clean up content before diffing to remove markdown artifacts
    const cleanContent = (content: string) => {
      return content
        .replace(/\|/g, ' ') // Remove pipe characters
        .replace(/-{2,}/g, ' ') // Remove multiple hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };
    
    const cleanOriginal = cleanContent(originalContent);
    const cleanOptimized = cleanContent(optimizedContent);
    
    const changes = Diff.diffWordsWithSpace(cleanOriginal, cleanOptimized);
    return changes;
  }, [originalContent, optimizedContent, isEditing]);

  const renderDiffContent = () => {
    // Process content to create proper paragraphs and sections
    const formatText = (text: string) => {
      return text
        .replace(/\|/g, ' ') // Remove pipe characters
        .replace(/-{2,}/g, ' ') // Remove multiple hyphens
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
    };

    const createParagraphs = (text: string) => {
      // Clean up the text first
      const cleanedText = text
        .replace(/\s+/g, ' ')           // Normalize spaces
        .replace(/\n\s*\n/g, '\n\n')    // Normalize line breaks
        .trim();
      
      // Split into logical paragraphs by double line breaks first
      const paragraphs = cleanedText
        .split(/\n\n+/)
        .filter(para => para.trim().length > 0);
      
      return paragraphs.map(paragraph => {
        const trimmed = paragraph.trim();
        
        // Split very long paragraphs at sentence boundaries
        if (trimmed.length > 300) {
          return trimmed.split(/(?<=\.)\s+(?=[A-Z])/)
            .filter(sentence => sentence.trim().length > 0);
        }
        
        return [trimmed];
      }).flat();
    };

    if (!diffParts) {
      const formattedContent = formatText(contentToShow);
      const paragraphs = createParagraphs(formattedContent);
      
      return (
        <div className="font-sans text-sm text-gray-800 leading-relaxed space-y-3">
          {paragraphs.map((paragraph, index) => {
            const trimmedParagraph = paragraph.trim();
            
            // Check if it's a major section header (all caps)
            if (/^[A-Z\s&-]{5,}$/.test(trimmedParagraph) || 
                /^(PROFESSIONAL EXPERIENCE|EDUCATION|SKILLS|CORE COMPETENCIES|TECHNICAL SKILLS|CERTIFICATIONS|PROJECTS|ACHIEVEMENTS|SUMMARY|OBJECTIVE|CONTACT|EXPERIENCE)$/i.test(trimmedParagraph)) {
              return (
                <div key={index} className="font-bold text-gray-900 text-base uppercase tracking-wide border-b border-gray-300 pb-1 mb-3 mt-6">
                  {trimmedParagraph}
                </div>
              );
            }
            
            // Check if it's a job title or company (has dash or year)
            if (/^[A-Z][A-Za-z\s]+(–|—|\s-\s)[A-Z]/.test(trimmedParagraph) || 
                /\d{4}/.test(trimmedParagraph) ||
                (/^[A-Z]/.test(trimmedParagraph) && trimmedParagraph.length < 100)) {
              return (
                <div key={index} className="font-semibold text-gray-800 mt-4 mb-2">
                  {trimmedParagraph}
                </div>
              );
            }
            
            // Regular paragraph content - split by sentences for better readability
            const sentences = trimmedParagraph.split(/(?<=\.)\s+(?=[A-Z])/).filter(s => s.trim());
            
            if (sentences.length > 1) {
              return (
                <div key={index} className="mb-4 leading-relaxed space-y-2">
                  {sentences.map((sentence, sIndex) => (
                    <div key={sIndex} className="text-gray-700">
                      {sentence.trim()}
                    </div>
                  ))}
                </div>
              );
            }
            
            return (
              <div key={index} className="mb-3 leading-relaxed text-gray-700">
                {trimmedParagraph}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="font-sans text-sm text-gray-800 leading-relaxed">
        <div 
          className="space-y-3"
          style={{
            lineHeight: '1.6',
            wordBreak: 'break-word'
          }}
        >
          {diffParts.map((part, index) => {
            if (part.added) {
              return (
                <span
                  key={index}
                  className="bg-green-100 text-green-800 px-1 rounded border-l-2 border-green-400 font-medium"
                  title="AI-added content"
                >
                  {part.value}
                </span>
              );
            } else if (part.removed) {
              // Skip removed content - don't render crossed-out text
              return null;
            } else {
              return <span key={index}>{part.value}</span>;
            }
          })}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-semibold text-sm">3</span>
            </div>
            <CardTitle className="text-lg">Content Preview</CardTitle>
          </div>
          
          <div className="flex items-center space-x-2">
            {hasAppliedRecommendations && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                {appliedRecommendations.length} applied
              </Badge>
            )}
            
            {isOptimizing && (
              <Badge variant="secondary" className="bg-amber-100 text-amber-700 flex items-center space-x-1">
                <Clock className="h-3 w-3 animate-spin" />
                <span>AI is thinking...</span>
              </Badge>
            )}
            
            {hasOptimizations && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUseInteractiveEditor(!useInteractiveEditor)}
                className="h-8 px-2"
                title={useInteractiveEditor ? "Switch to basic editor" : "Switch to interactive editor"}
              >
                {useInteractiveEditor ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {useInteractiveEditor ? 'Basic' : 'Interactive'}
              </Button>
            )}
            
            {!hasOptimizations && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(!isEditing)}
                className="h-8 px-2"
              >
                {isEditing ? <Eye className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {isEditing ? 'Preview' : 'Edit'}
              </Button>
            )}
          </div>
        </div>

        {hasOptimizations && !isOptimizing && (
          <div className="text-sm text-green-600 bg-green-50 rounded-lg p-3 border border-green-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="font-medium">Content updated with AI optimizations</span>
            </div>
            <p className="text-green-700 mt-1">
              <span className="bg-green-100 text-green-800 px-1 rounded font-medium">Green highlights</span> show AI-added content. You can further edit the content below.
            </p>
          </div>
        )}

        {isOptimizing && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="font-medium">AI is analyzing and optimizing your resume...</span>
            </div>
            <p className="text-amber-700 mt-1">
              This may take a few moments. Changes will be highlighted when complete.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Content Editor/Viewer */}
        <div className="space-y-3">
          {useInteractiveEditor && hasOptimizations ? (
            <InteractiveResumeEditor
              originalContent={originalContent}
              optimizedContent={optimizedContent}
              onContentChange={setEditedContent}
              className="bg-gray-50 rounded-lg border"
            />
          ) : isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Edit your resume content here..."
              />
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 border min-h-[400px]">
              {renderDiffContent()}
            </div>
          )}
        </div>

        {/* Template Selection & Download */}
        <div className="border-t pt-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Document Template</label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {templates.map((template) => (
                <option key={template.name} value={template.name}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleDownload('txt')}
              disabled={generateDocumentMutation.isPending}
              size="sm"
              variant="outline"
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download TXT
            </Button>
            <Button
              onClick={() => handleDownload('docx')}
              disabled={generateDocumentMutation.isPending}
              size="sm"
              variant="outline"
              className="flex-1 min-w-[120px]"
            >
              <Download className="h-4 w-4 mr-2" />
              Download DOCX
            </Button>
            <Button
              onClick={() => handleDownload('pdf')}
              disabled={generateDocumentMutation.isPending}
              size="sm"
              className="flex-1 min-w-[120px] bg-indigo-600 hover:bg-indigo-700"
            >
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>

        {/* Status Messages */}
        {!hasOptimizations && hasAppliedRecommendations && (
          <div className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3 border border-amber-200">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
              <span>Applying {appliedRecommendations.length} recommendation{appliedRecommendations.length > 1 ? 's' : ''}...</span>
            </div>
          </div>
        )}

        {!hasAppliedRecommendations && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 border border-gray-200 text-center">
            <p>Apply suggestions from the analysis to see optimized content here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}