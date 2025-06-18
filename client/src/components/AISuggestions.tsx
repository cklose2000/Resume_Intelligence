import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Lightbulb,
  TrendingUp,
  FileText,
  Target,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';

interface Suggestion {
  id: string;
  type: 'edit' | 'addition' | 'removal';
  section: string;
  index?: number;
  field?: string;
  original?: string;
  suggested: string;
  reason: string;
  confidence?: number;
  impact?: 'high' | 'medium' | 'low';
  category?: string;
}

interface AISuggestionsProps {
  suggestions: Suggestion[];
  onApplySuggestion: (suggestion: Suggestion) => void;
  onRejectSuggestion?: (suggestionId: string) => void;
  className?: string;
}

export function AISuggestions({
  suggestions,
  onApplySuggestion,
  onRejectSuggestion,
  className
}: AISuggestionsProps) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [rejectedSuggestions, setRejectedSuggestions] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group suggestions by category
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    const category = suggestion.category || suggestion.section;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(suggestion);
    return acc;
  }, {} as Record<string, Suggestion[]>);

  const handleApply = (suggestion: Suggestion) => {
    onApplySuggestion(suggestion);
    setAppliedSuggestions(prev => new Set(prev).add(suggestion.id));
  };

  const handleReject = (suggestionId: string) => {
    onRejectSuggestion?.(suggestionId);
    setRejectedSuggestions(prev => new Set(prev).add(suggestionId));
  };

  const handleApplyAll = () => {
    const unappliedSuggestions = suggestions.filter(
      s => !appliedSuggestions.has(s.id) && !rejectedSuggestions.has(s.id)
    );
    
    unappliedSuggestions.forEach(suggestion => {
      handleApply(suggestion);
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'edit':
        return <Edit3 className="h-4 w-4" />;
      case 'addition':
        return <Plus className="h-4 w-4" />;
      case 'removal':
        return <Trash2 className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact?: string) => {
    switch (impact) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-amber-600 bg-amber-50';
      case 'low':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const filteredSuggestions = selectedCategory === 'all'
    ? suggestions
    : groupedSuggestions[selectedCategory] || [];

  const pendingSuggestions = filteredSuggestions.filter(
    s => !appliedSuggestions.has(s.id) && !rejectedSuggestions.has(s.id)
  );

  return (
    <div className={cn("ai-suggestions flex flex-col h-full bg-white", className)}>
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            AI Suggestions ({pendingSuggestions.length})
          </h3>
          {pendingSuggestions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleApplyAll}
              className="text-xs"
            >
              Apply All
            </Button>
          )}
        </div>

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-4 h-8">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="experience" className="text-xs">Experience</TabsTrigger>
            <TabsTrigger value="skills" className="text-xs">Skills</TabsTrigger>
            <TabsTrigger value="other" className="text-xs">Other</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {pendingSuggestions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p className="text-sm">All suggestions have been reviewed!</p>
            </div>
          ) : (
            pendingSuggestions.map(suggestion => (
              <Card key={suggestion.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-1.5 rounded",
                    getImpactColor(suggestion.impact)
                  )}>
                    {getIcon(suggestion.type)}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {suggestion.section}
                      </Badge>
                      {suggestion.impact && (
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", getImpactColor(suggestion.impact))}
                        >
                          {suggestion.impact} impact
                        </Badge>
                      )}
                      {suggestion.confidence && (
                        <span className="text-xs text-gray-500">
                          {Math.round(suggestion.confidence * 100)}% confident
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {suggestion.original && (
                        <div className="text-sm">
                          <span className="text-gray-500">Original:</span>
                          <p className="text-gray-700 line-through mt-0.5">
                            {suggestion.original}
                          </p>
                        </div>
                      )}
                      
                      <div className="text-sm">
                        <span className="text-gray-500">
                          {suggestion.type === 'edit' ? 'Suggested:' : 
                           suggestion.type === 'addition' ? 'Add:' : 'Remove:'}
                        </span>
                        <p className="text-gray-900 font-medium mt-0.5">
                          {suggestion.suggested}
                        </p>
                      </div>

                      <div className="text-xs text-gray-600 italic">
                        <AlertCircle className="h-3 w-3 inline mr-1" />
                        {suggestion.reason}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleApply(suggestion)}
                        className="text-xs"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(suggestion.id)}
                        className="text-xs"
                      >
                        <XCircle className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Summary Stats */}
      <div className="px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-600" />
              Applied: {appliedSuggestions.size}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-600" />
              Rejected: {rejectedSuggestions.size}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Pending: {pendingSuggestions.length}
          </span>
        </div>
      </div>

      <style jsx global>{`
        .ai-suggestions .suggestion-diff {
          display: inline-block;
          padding: 2px 4px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 12px;
        }
        
        .ai-suggestions .suggestion-diff.removed {
          background-color: #fee2e2;
          color: #dc2626;
          text-decoration: line-through;
        }
        
        .ai-suggestions .suggestion-diff.added {
          background-color: #dcfce7;
          color: #16a34a;
        }
      `}</style>
    </div>
  );
}