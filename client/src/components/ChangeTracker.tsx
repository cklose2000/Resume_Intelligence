import React, { useState, useEffect } from 'react';
import * as Diff from 'diff';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  RotateCcw,
  FileText,
  GitBranch
} from 'lucide-react';

interface Change {
  id: string;
  type: 'addition' | 'deletion' | 'modification';
  content: string;
  originalContent?: string;
  lineNumber?: number;
  section?: string;
  timestamp: Date;
  accepted?: boolean;
}

interface ChangeTrackerProps {
  originalContent: string;
  currentContent: string;
  onAcceptChange?: (changeId: string) => void;
  onRejectChange?: (changeId: string) => void;
  onRevertAll?: () => void;
  className?: string;
}

export function ChangeTracker({
  originalContent,
  currentContent,
  onAcceptChange,
  onRejectChange,
  onRevertAll,
  className
}: ChangeTrackerProps) {
  const [changes, setChanges] = useState<Change[]>([]);
  const [showChanges, setShowChanges] = useState(true);
  const [viewMode, setViewMode] = useState<'inline' | 'side-by-side'>('inline');
  const [filter, setFilter] = useState<'all' | 'additions' | 'deletions' | 'modifications'>('all');

  useEffect(() => {
    // Calculate diff between original and current content
    const calculateChanges = () => {
      const diffResult = Diff.diffLines(originalContent, currentContent, {
        ignoreWhitespace: false
      });

      const newChanges: Change[] = [];
      let lineNumber = 0;

      diffResult.forEach((part, index) => {
        if (part.added) {
          newChanges.push({
            id: `change-${index}`,
            type: 'addition',
            content: part.value,
            lineNumber: lineNumber,
            timestamp: new Date()
          });
        } else if (part.removed) {
          newChanges.push({
            id: `change-${index}`,
            type: 'deletion',
            content: part.value,
            originalContent: part.value,
            lineNumber: lineNumber,
            timestamp: new Date()
          });
        } else {
          // Check for modifications (removed followed by added)
          const nextPart = diffResult[index + 1];
          if (part.removed && nextPart?.added) {
            newChanges.push({
              id: `change-${index}`,
              type: 'modification',
              content: nextPart.value,
              originalContent: part.value,
              lineNumber: lineNumber,
              timestamp: new Date()
            });
          }
        }

        if (!part.removed) {
          lineNumber += (part.value.match(/\n/g) || []).length;
        }
      });

      setChanges(newChanges);
    };

    calculateChanges();
  }, [originalContent, currentContent]);

  const getChangeStats = () => {
    const stats = {
      additions: changes.filter(c => c.type === 'addition').length,
      deletions: changes.filter(c => c.type === 'deletion').length,
      modifications: changes.filter(c => c.type === 'modification').length
    };
    return stats;
  };

  const filteredChanges = changes.filter(change => {
    if (filter === 'all') return true;
    return change.type === filter.slice(0, -1) as any;
  });

  const renderInlineView = () => {
    const diffResult = Diff.diffWords(originalContent, currentContent);
    
    return (
      <div className="prose prose-sm max-w-none p-4">
        {diffResult.map((part, index) => {
          if (part.added) {
            return (
              <span
                key={index}
                className="inline-block bg-green-100 text-green-800 px-1 rounded"
                title="Added"
              >
                {part.value}
              </span>
            );
          } else if (part.removed) {
            return (
              <span
                key={index}
                className="inline-block bg-red-100 text-red-800 px-1 rounded line-through"
                title="Removed"
              >
                {part.value}
              </span>
            );
          } else {
            return <span key={index}>{part.value}</span>;
          }
        })}
      </div>
    );
  };

  const renderSideBySideView = () => {
    return (
      <div className="grid grid-cols-2 gap-4 p-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 mb-2">Original</h4>
          <div className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap">
            {originalContent}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-gray-600 mb-2">Current</h4>
          <div className="bg-gray-50 p-3 rounded border text-sm whitespace-pre-wrap">
            {renderInlineView()}
          </div>
        </div>
      </div>
    );
  };

  const stats = getChangeStats();

  return (
    <div className={cn("change-tracker bg-white rounded-lg border", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            Change Tracking
          </h3>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <span className="text-green-600">+{stats.additions}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="text-red-600">-{stats.deletions}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="text-amber-600">~{stats.modifications}</span>
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowChanges(!showChanges)}
            className="gap-2"
          >
            {showChanges ? (
              <>
                <EyeOff className="h-3 w-3" />
                Hide
              </>
            ) : (
              <>
                <Eye className="h-3 w-3" />
                Show
              </>
            )}
          </Button>
          
          {onRevertAll && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevertAll}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              <RotateCcw className="h-3 w-3" />
              Revert All
            </Button>
          )}
        </div>
      </div>

      {showChanges && (
        <>
          {/* View Mode Selector */}
          <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">View:</span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === 'inline' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('inline')}
                  className="h-7 text-xs"
                >
                  Inline
                </Button>
                <Button
                  variant={viewMode === 'side-by-side' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('side-by-side')}
                  className="h-7 text-xs"
                >
                  Side by Side
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Filter:</span>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="text-xs border rounded px-2 py-1"
              >
                <option value="all">All Changes</option>
                <option value="additions">Additions</option>
                <option value="deletions">Deletions</option>
                <option value="modifications">Modifications</option>
              </select>
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-auto">
            {viewMode === 'inline' ? renderInlineView() : renderSideBySideView()}
          </div>
        </>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .change-tracker .diff-addition {
          background-color: #dcfce7;
          color: #15803d;
          padding: 2px 4px;
          border-radius: 3px;
          text-decoration: none;
        }
        
        .change-tracker .diff-deletion {
          background-color: #fee2e2;
          color: #dc2626;
          padding: 2px 4px;
          border-radius: 3px;
          text-decoration: line-through;
        }
        
        .change-tracker .diff-modification {
          background-color: #fef3c7;
          color: #b45309;
          padding: 2px 4px;
          border-radius: 3px;
        }
        
        .change-tracker .line-number {
          color: #6b7280;
          font-size: 0.75rem;
          font-family: monospace;
          user-select: none;
          padding-right: 8px;
          min-width: 40px;
          display: inline-block;
          text-align: right;
        }
      ` }} />
    </div>
  );
}